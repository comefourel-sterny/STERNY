// Supabase Edge Function : verify-document
// Vérifie une pièce du dossier locataire (certificat de scolarité, assurance, RIB) par Google Vision.
// Patch 4a-2, étape 2 (DETTES #167 et #173). Décision du 25/09/2026 consignée en VISION-ARCHITECTURE.
//
// Contrat : le navigateur n'envoie que { docType }. Tout le reste est établi par le serveur :
// l'appelant (jeton de connexion), son nom et le chemin du fichier (table users), le fichier (bucket documents).
// Seul ce serveur écrit doc_<type>_statut et doc_<type>_motif_rejet : toujours les deux ensemble, jamais avec
// le chemin (le verrou remettrait le statut à zéro). Une panne technique n'écrit aucun verdict. Le verdict
// n'est écrit que si le chemin vérifié est toujours en place.
// Les pièces du garant ne sont pas vérifiées ici (fin de 4b).
//
// Secrets requis : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (fournis par Supabase), GOOGLE_CLOUD_API_KEY.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Réponse sans verdict : rien n'est écrit en base.
function sansVerdict(erreur: string, status: number): Response {
  return json({ erreur }, status);
}

const TAILLE_MAX = 5 * 1024 * 1024;

// Colonnes de la table users, par type de pièce.
const COLONNES = {
  scolarite: { chemin: "doc_scolarite_url", statut: "doc_scolarite_statut", motif: "doc_scolarite_motif_rejet" },
  assurance: { chemin: "doc_assurance_url", statut: "doc_assurance_statut", motif: "doc_assurance_motif_rejet" },
  rib: { chemin: "doc_rib_url", statut: "doc_rib_statut", motif: "doc_rib_motif_rejet" },
} as const;

type DocType = keyof typeof COLONNES;

// Règles de vérification par type de pièce (reprises de la version précédente, garant retiré).
const DOCUMENT_RULES: Record<DocType, {
  label: string;
  coreKeywords: string[];
  supportKeywords: string[];
  negativeKeywords: string[];
  minCoreRequired: number;
  minTotalRequired: number;
  checkDate: boolean;
  description: string;
}> = {
  scolarite: {
    label: "Certificat de scolarité",
    coreKeywords: [
      "certificat de scolarite", "attestation de scolarite", "attestation d'inscription",
      "certificat d'inscription", "carte etudiant", "carte d'etudiant",
      "scolarite", "inscrit en", "inscrite en", "annee universitaire",
      "annee academique", "annee scolaire"
    ],
    supportKeywords: [
      "universite", "ecole", "etudiant", "etudiante", "licence", "master",
      "bts", "but", "campus", "faculte", "ufr", "formation",
      "apprentissage", "alternance", "cfa", "rncp", "diplome",
      "semestre", "etablissement", "academie", "rectorat"
    ],
    negativeKeywords: [
      "facture", "devis", "bon de commande", "ticket de caisse",
      "releve de compte", "bulletin de salaire", "fiche de paie",
      "quittance de loyer", "avis d'imposition"
    ],
    minCoreRequired: 1,
    minTotalRequired: 3,
    checkDate: true,
    description: "Le document doit être un certificat de scolarité ou une attestation d'inscription à ton nom"
  },
  assurance: {
    label: "Assurance habitation",
    coreKeywords: [
      "assurance habitation", "assurance multirisque", "responsabilite civile",
      "attestation d'assurance", "contrat d'assurance", "police d'assurance",
      "assurance locative", "multirisque habitation"
    ],
    supportKeywords: [
      "locataire", "sinistre", "dommage", "incendie", "degat des eaux",
      "vol", "couverture", "prime", "souscription", "garantie",
      "risques locatifs", "dommages aux biens", "franchise"
    ],
    negativeKeywords: [
      "facture", "devis", "bon de commande", "ticket de caisse",
      "certificat de scolarite", "bulletin de salaire", "releve bancaire"
    ],
    minCoreRequired: 1,
    minTotalRequired: 3,
    checkDate: true,
    description: "Le document doit être une attestation d'assurance habitation ou responsabilité civile à ton nom"
  },
  rib: {
    label: "RIB",
    coreKeywords: [
      "iban", "releve d'identite bancaire", "rib", "bic"
    ],
    supportKeywords: [
      "bancaire", "banque", "titulaire", "domiciliation", "swift",
      "agence", "guichet", "compte", "credit agricole", "credit mutuel",
      "societe generale", "bnp", "banque populaire", "caisse d'epargne",
      "la banque postale", "boursorama", "revolut", "n26", "lcl",
      "cle rib", "code banque", "code guichet"
    ],
    negativeKeywords: [
      "facture", "devis", "certificat de scolarite", "assurance habitation",
      "bulletin de salaire", "attestation d'assurance", "quittance de loyer"
    ],
    minCoreRequired: 1,
    minTotalRequired: 2,
    checkDate: false,
    description: "Le document doit être un relevé d'identité bancaire (RIB) avec IBAN visible à ton nom"
  }
};

// Normaliser un texte (enlever accents + minuscules)
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Format établi par les premiers octets du fichier, jamais par ce que déclare le navigateur.
function detecterFormat(o: Uint8Array): "pdf" | "image" | null {
  if (o.length >= 5 && o[0] === 0x25 && o[1] === 0x50 && o[2] === 0x44 && o[3] === 0x46 && o[4] === 0x2d) return "pdf"; // %PDF-
  if (o.length >= 8 && o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47
      && o[4] === 0x0d && o[5] === 0x0a && o[6] === 0x1a && o[7] === 0x0a) return "image"; // PNG
  if (o.length >= 3 && o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return "image"; // JPEG
  return null;
}

class PanneOcr extends Error {}

// Lecture du texte par Google Vision. Toute erreur de Google ou du réseau lève PanneOcr : aucun verdict.
async function lireTexte(tampon: ArrayBuffer, format: "pdf" | "image", cle: string): Promise<string> {
  const content = encodeBase64(tampon);
  const pdf = format === "pdf";
  const url = pdf
    ? "https://vision.googleapis.com/v1/files:annotate"
    : "https://vision.googleapis.com/v1/images:annotate";
  const requete = pdf
    ? { inputConfig: { content, mimeType: "application/pdf" }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] }
    : { image: { content }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] };

  let reponse: Response;
  try {
    reponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
      body: JSON.stringify({ requests: [requete] }),
    });
  } catch (e) {
    throw new PanneOcr(`réseau : ${String(e)}`);
  }
  if (!reponse.ok) {
    const corps = await reponse.text().catch(() => "");
    throw new PanneOcr(`HTTP ${reponse.status} ${corps.substring(0, 300)}`);
  }
  const donnees = await reponse.json().catch(() => null);
  const r0 = donnees?.responses?.[0];
  if (!r0) throw new PanneOcr("réponse vide");
  if (r0.error) throw new PanneOcr(`erreur Google ${r0.error.code ?? ""} ${r0.error.message ?? ""}`);

  if (!pdf) return r0.fullTextAnnotation?.text ?? "";

  // PDF : une réponse par page (les 5 premières pages par défaut).
  const pages = Array.isArray(r0.responses) ? r0.responses : [];
  if (pages.some((p: { error?: unknown }) => p?.error)) throw new PanneOcr("erreur Google sur une page");
  return pages.map((p: { fullTextAnnotation?: { text?: string } }) => p?.fullTextAnnotation?.text ?? "").join("\n");
}

// Le nom de famille doit apparaître dans le document.
function nomPresent(normalizedText: string, nom: string): boolean {
  const nNom = normalize(nom);
  return nNom.length >= 2 && normalizedText.includes(nNom);
}

// Une date récente doit apparaître dans le document.
function dateRecentePresente(normalizedText: string): boolean {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  if (new RegExp(`(${currentYear}|${lastYear})`).test(normalizedText)) return true;
  return new RegExp(`(${lastYear}[\\s/-]+${currentYear}|${currentYear}[\\s/-]+${currentYear + 1})`).test(normalizedText);
}

// Analyse du texte : renvoie le motif de rejet, ou null si le document est accepté.
function analyser(docType: DocType, texte: string, nom: string): string | null {
  const rules = DOCUMENT_RULES[docType];
  const normalizedText = normalize(texte);

  const negativeFound = rules.negativeKeywords.filter(kw => normalizedText.includes(normalize(kw)));
  if (negativeFound.length > 0) {
    return `Ce document semble être autre chose qu'un ${rules.label.toLowerCase()} (détecté : ${negativeFound[0]}).`;
  }

  const coreFound = rules.coreKeywords.filter(kw => normalizedText.includes(normalize(kw)));
  const supportFound = rules.supportKeywords.filter(kw => normalizedText.includes(normalize(kw)));
  const totalFound = coreFound.length + supportFound.length;

  if (coreFound.length < rules.minCoreRequired) {
    return `Ce document ne semble pas être un ${rules.label.toLowerCase()}. ${rules.description}.`;
  }
  if (totalFound < rules.minTotalRequired) {
    return `Le document ne contient pas assez d'éléments pour confirmer qu'il s'agit d'un ${rules.label.toLowerCase()}.`;
  }
  if (!nomPresent(normalizedText, nom)) {
    return "Ton nom n'apparaît pas sur le document. Le document doit être à ton nom.";
  }
  if (rules.checkDate && !dateRecentePresente(normalizedText)) {
    return "Le document ne contient pas de date récente. Dépose un document de l'année en cours.";
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return sansVerdict("Méthode non autorisée", 405);
  }

  try {
    // 1. Appelant authentifié. La clé publique seule n'identifie aucun utilisateur : refusée ici.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jeton = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jeton) return sansVerdict("Non authentifié", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      console.error("[verify-document] configuration Supabase absente");
      return sansVerdict("Service indisponible", 500);
    }
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await admin.auth.getUser(jeton);
    const user = authData?.user;
    if (authError || !user) return sansVerdict("Non authentifié", 401);
    const userId = user.id;

    // 2. Seul docType est lu dans le corps. Seules les trois pièces personnelles sont acceptées.
    const corps = await req.json().catch(() => null);
    const docType = corps?.docType;
    if (typeof docType !== "string" || !Object.hasOwn(COLONNES, docType)) {
      return sansVerdict("Type de document non vérifiable", 400);
    }
    const col = COLONNES[docType as DocType];

    // 3. Clé Google absente : aucun verdict.
    const cleGoogle = Deno.env.get("GOOGLE_CLOUD_API_KEY") ?? "";
    if (!cleGoogle) {
      console.error("[verify-document] GOOGLE_CLOUD_API_KEY absente");
      return sansVerdict("Vérification indisponible pour le moment. Réessaie plus tard.", 503);
    }

    // 4. Nom et chemin lus en base par le serveur.
    const { data: ligne, error: lectureError } = await admin
      .from("users")
      .select(`nom, ${col.chemin}`)
      .eq("id", userId)
      .maybeSingle();
    if (lectureError) {
      console.error("[verify-document] lecture users :", lectureError.message);
      return sansVerdict("Vérification indisponible pour le moment. Réessaie plus tard.", 500);
    }
    if (!ligne) return sansVerdict("Compte introuvable", 404);

    const chemin = (ligne as Record<string, unknown>)[col.chemin];
    if (typeof chemin !== "string" || !chemin) {
      return sansVerdict("Aucun document déposé pour cette pièce.", 400);
    }
    if (!chemin.startsWith(`${userId}-${docType}-`)) {
      return sansVerdict("Ce document ne peut pas être vérifié.", 403);
    }

    // 5. Nom vide : refus avec motif, sans verdict (le fichier n'a pas été jugé).
    const nom = String((ligne as Record<string, unknown>).nom ?? "").trim();
    if (!nom) {
      return sansVerdict("Renseigne ton nom dans « Infos personnelles », puis relance la vérification.", 422);
    }

    // 6. Téléchargement du fichier depuis le bucket privé.
    const { data: blob, error: dlError } = await admin.storage.from("documents").download(chemin);
    if (dlError || !blob) {
      console.error("[verify-document] téléchargement :", dlError?.message);
      return sansVerdict("Le document n'a pas pu être lu. Réessaie plus tard.", 502);
    }
    const tampon = await blob.arrayBuffer();
    const contenu = new Uint8Array(tampon);

    // 7. Verdict : taille, format, lecture, analyse.
    let statut: "verifie" | "rejete";
    let motif: string | null;

    const format = detecterFormat(contenu);
    if (contenu.length > TAILLE_MAX) {
      statut = "rejete";
      motif = "Fichier trop lourd : 5 Mo maximum.";
    } else if (!format) {
      statut = "rejete";
      motif = "Format non reconnu : PDF, JPEG ou PNG uniquement.";
    } else {
      let texte: string;
      try {
        texte = await lireTexte(tampon, format, cleGoogle);
      } catch (e) {
        console.error("[verify-document] panne OCR :", e instanceof Error ? e.message : String(e));
        return sansVerdict("Vérification indisponible pour le moment. Réessaie plus tard.", 502);
      }
      if (texte.trim().length < 20) {
        statut = "rejete";
        motif = "Impossible de lire le contenu du document. Dépose un fichier lisible (PDF ou photo nette).";
      } else {
        motif = analyser(docType as DocType, texte, nom);
        statut = motif === null ? "verifie" : "rejete";
      }
    }

    // 8. Écriture du verdict, seulement si le chemin vérifié est toujours en place.
    const { data: ecrit, error: ecritureError } = await admin
      .from("users")
      .update({ [col.statut]: statut, [col.motif]: motif })
      .eq("id", userId)
      .eq(col.chemin, chemin)
      .select("id");
    if (ecritureError) {
      console.error("[verify-document] écriture du verdict :", ecritureError.message);
      return sansVerdict("Vérification indisponible pour le moment. Réessaie plus tard.", 500);
    }
    if (!ecrit || ecrit.length === 0) {
      return sansVerdict("Le document a changé pendant la vérification. Relance la vérification.", 409);
    }

    console.log(`[verify-document] ${docType} ${userId.substring(0, 8)} → ${statut}`);
    return json({ statut, motif }, 200);

  } catch (error) {
    console.error("[verify-document] erreur :", error instanceof Error ? error.message : String(error));
    return sansVerdict("Vérification indisponible pour le moment. Réessaie plus tard.", 500);
  }
});
