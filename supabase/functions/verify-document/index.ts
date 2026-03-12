// Supabase Edge Function : verify-document
// Vérifie automatiquement les documents uploadés via Google Vision API (OCR)
// Secrets requis : GOOGLE_CLOUD_API_KEY
// À déployer : Dashboard > Edge Functions > verify-document > Editor

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_CLOUD_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Règles de vérification par type de document
const DOCUMENT_RULES: Record<string, {
  label: string;
  coreKeywords: string[];
  supportKeywords: string[];
  negativeKeywords: string[];
  minCoreRequired: number;
  minTotalRequired: number;
  checkName: boolean;
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
    checkName: true,
    checkDate: true,
    description: "Le document doit être un certificat de scolarité ou une attestation d'inscription à votre nom"
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
    checkName: true,
    checkDate: true,
    description: "Le document doit être une attestation d'assurance habitation ou responsabilité civile à votre nom"
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
    checkName: true,
    checkDate: false,
    description: "Le document doit être un relevé d'identité bancaire (RIB) avec IBAN visible à votre nom"
  },
  garant_id: {
    label: "Pièce d'identité du garant",
    coreKeywords: [
      "carte nationale d'identite", "carte d'identite", "passeport",
      "titre de sejour", "republique francaise", "identity card",
      "passport"
    ],
    supportKeywords: [
      "nationalite", "ne le", "nee le", "sexe", "signature",
      "delivre", "prefecture", "mairie", "date d'expiration",
      "valide jusqu", "lieu de naissance"
    ],
    negativeKeywords: [
      "facture", "devis", "certificat de scolarite", "assurance",
      "releve bancaire", "bulletin de salaire"
    ],
    minCoreRequired: 1,
    minTotalRequired: 3,
    checkName: false,
    checkDate: false,
    description: "Le document doit être une pièce d'identité valide (CNI, passeport ou titre de séjour)"
  },
  cautionnement: {
    label: "Acte de cautionnement",
    coreKeywords: [
      "acte de cautionnement", "cautionnement solidaire", "caution solidaire",
      "se porte caution", "me porte caution", "engage a payer"
    ],
    supportKeywords: [
      "garant", "loyer", "bailleur", "locataire", "bail",
      "soussigne", "certifie", "declare", "obligation",
      "paiement", "charges", "mensuel"
    ],
    negativeKeywords: [
      "facture", "devis", "certificat de scolarite",
      "releve bancaire", "bulletin de salaire"
    ],
    minCoreRequired: 1,
    minTotalRequired: 3,
    checkName: false,
    checkDate: true,
    description: "Le document doit être un acte de cautionnement signé par le garant"
  }
};

// Normaliser un texte (enlever accents + minuscules)
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Vérifier si le nom de l'utilisateur apparaît dans le document
function checkNameInDocument(normalizedText: string, nom: string, prenom: string): { found: boolean; detail: string } {
  const nNom = normalize(nom || "");
  const nPrenom = normalize(prenom || "");

  if (!nNom && !nPrenom) {
    return { found: true, detail: "Pas de nom fourni pour vérification" };
  }

  const nomFound = nNom.length >= 2 && normalizedText.includes(nNom);
  const prenomFound = nPrenom.length >= 2 && normalizedText.includes(nPrenom);

  // On exige au moins le nom de famille
  if (nomFound) {
    return { found: true, detail: `Nom trouvé${prenomFound ? ' + prénom' : ''}` };
  }

  return { found: false, detail: "Le nom du titulaire n'apparaît pas dans le document" };
}

// Vérifier qu'une date récente apparaît dans le document
function checkRecentDate(normalizedText: string): { found: boolean; detail: string } {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  // Chercher l'année en cours ou précédente
  const yearRegex = new RegExp(`(${currentYear}|${lastYear})`, "g");
  const yearsFound = normalizedText.match(yearRegex);

  if (yearsFound && yearsFound.length > 0) {
    return { found: true, detail: `Année ${yearsFound[0]} trouvée` };
  }

  // Chercher aussi format "2024/2025", "2024-2025", "2025/2026"
  const academicYearRegex = new RegExp(`(${lastYear}[\\s/-]+${currentYear}|${currentYear}[\\s/-]+${currentYear + 1})`, "g");
  const academicYears = normalizedText.match(academicYearRegex);

  if (academicYears && academicYears.length > 0) {
    return { found: true, detail: `Année académique ${academicYears[0]} trouvée` };
  }

  return { found: false, detail: `Aucune date récente trouvée (${lastYear} ou ${currentYear} attendu)` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType, docType, fileName, userNom, userPrenom } = await req.json();

    if (!fileBase64 || !docType) {
      return new Response(JSON.stringify({
        error: "fileBase64 et docType sont requis"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rules = DOCUMENT_RULES[docType];
    if (!rules) {
      return new Response(JSON.stringify({
        error: "Type de document inconnu"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifications basiques
    const errors: string[] = [];

    const fileSizeApprox = (fileBase64.length * 3) / 4;
    if (fileSizeApprox < 10 * 1024) {
      errors.push("Le fichier semble trop petit pour être un document valide (< 10 Ko)");
    }

    const allowedMimes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedMimes.includes(mimeType)) {
      errors.push("Format non supporté. PDF, JPG ou PNG uniquement.");
    }

    if (docType === "cautionnement" && mimeType !== "application/pdf") {
      errors.push("L'acte de cautionnement doit être au format PDF");
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({
        statut: "rejete",
        motif: errors.join(". "),
        label: rules.label
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ====================================================
    // OCR via Google Vision API (images:annotate uniquement)
    // Les PDFs sont convertis en images côté client via pdf.js
    // ====================================================
    let extractedText = "";
    const ocrDebug: Record<string, unknown> = { mimeType, base64Length: fileBase64?.length || 0 };

    if (GOOGLE_API_KEY) {
      try {
        const googleResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [{
                image: { content: fileBase64 },
                features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }]
              }]
            })
          }
        );

        ocrDebug.httpStatus = googleResponse.status;

        if (googleResponse.ok) {
          const googleData = await googleResponse.json();
          const annotation = googleData.responses?.[0]?.fullTextAnnotation;
          if (annotation) {
            extractedText = annotation.text;
            ocrDebug.textExtracted = true;
          } else {
            ocrDebug.textExtracted = false;
            // Vérifier s'il y a une erreur dans la réponse Google
            const errorInfo = googleData.responses?.[0]?.error;
            if (errorInfo) {
              ocrDebug.googleError = errorInfo;
            }
          }
        } else {
          const errBody = await googleResponse.text();
          ocrDebug.errorBody = errBody.substring(0, 500);
          console.error("Google Vision error:", googleResponse.status, errBody);
        }

        ocrDebug.extractedTextLength = extractedText.length;
        console.log("OCR debug:", JSON.stringify(ocrDebug));
      } catch (ocrError) {
        ocrDebug.exception = String(ocrError);
        console.error("Google Vision OCR error:", ocrError);
      }
    } else {
      ocrDebug.error = "GOOGLE_CLOUD_API_KEY non configurée";
    }

    // ====================================================
    // Pas de texte extrait → rejet avec debug
    // ====================================================
    if (!extractedText || extractedText.trim().length < 20) {
      return new Response(JSON.stringify({
        statut: "rejete",
        motif: "Impossible de lire le contenu du document. Veuillez fournir un fichier lisible (PDF texte ou image nette).",
        label: rules.label,
        ocrUsed: false,
        debug: ocrDebug
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ====================================================
    // Analyse complète du document
    // ====================================================
    const normalizedText = normalize(extractedText);
    const rejectReasons: string[] = [];

    // 1. Mots-clés négatifs (documents qui ne correspondent pas)
    const negativeFound = rules.negativeKeywords.filter(kw => normalizedText.includes(normalize(kw)));
    if (negativeFound.length > 0) {
      rejectReasons.push(`Ce document semble être autre chose qu'un ${rules.label.toLowerCase()} (détecté : ${negativeFound[0]})`);
    }

    // 2. Core keywords
    const coreFound = rules.coreKeywords.filter(kw => normalizedText.includes(normalize(kw)));

    // 3. Support keywords
    const supportFound = rules.supportKeywords.filter(kw => normalizedText.includes(normalize(kw)));

    const totalFound = coreFound.length + supportFound.length;
    const hasEnoughCore = coreFound.length >= rules.minCoreRequired;
    const hasEnoughTotal = totalFound >= rules.minTotalRequired;

    if (!hasEnoughCore) {
      rejectReasons.push(`Ce document ne semble pas être un ${rules.label.toLowerCase()}. ${rules.description}.`);
    } else if (!hasEnoughTotal) {
      rejectReasons.push(`Le document ne contient pas assez d'éléments pour confirmer qu'il s'agit d'un ${rules.label.toLowerCase()}.`);
    }

    // 4. Vérification du nom (si requise)
    if (rules.checkName && rejectReasons.length === 0) {
      const nameCheck = checkNameInDocument(normalizedText, userNom || "", userPrenom || "");
      if (!nameCheck.found) {
        rejectReasons.push("Votre nom n'apparaît pas sur le document. Le document doit être à votre nom.");
      }
    }

    // 5. Vérification de date récente (si requise)
    if (rules.checkDate && rejectReasons.length === 0) {
      const dateCheck = checkRecentDate(normalizedText);
      if (!dateCheck.found) {
        rejectReasons.push("Le document ne contient pas de date récente. Veuillez fournir un document de l'année en cours.");
      }
    }

    // ====================================================
    // Résultat final
    // ====================================================
    console.log(`[${docType}] Core: ${coreFound.length}/${rules.minCoreRequired}, Support: ${supportFound.length}, Total: ${totalFound}/${rules.minTotalRequired}, Negative: ${negativeFound.length}, Reject: ${rejectReasons.length > 0}`);

    if (rejectReasons.length === 0) {
      return new Response(JSON.stringify({
        statut: "verifie",
        motif: null,
        label: rules.label,
        confidence: Math.min(100, Math.round((totalFound / rules.minTotalRequired) * 50 + 50)),
        ocrUsed: true
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({
        statut: "rejete",
        motif: rejectReasons[0],
        label: rules.label,
        confidence: 0,
        ocrUsed: true
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
