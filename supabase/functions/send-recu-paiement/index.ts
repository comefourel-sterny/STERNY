// Supabase Edge Function : send-recu-paiement
// Envoie un reçu de paiement par email au locataire après un paiement réussi.
// Appelée automatiquement par stripe-webhook après invoice.paid ou checkout.session.completed (impayé).
// À déployer dans : Dashboard > Edge Functions > Create > "send-recu-paiement"
// Secret requis : RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL = "https://rkffpmuhyvwwgfbdqmqr.supabase.co/storage/v1/object/public/public-assets/Logo-Sterny-V1.png";
const BASE_URL = "https://sterny.co";

// ================================================================
// UTILITAIRES
// ================================================================

function formatMois(moisStr: string): string {
  const date = new Date(moisStr + "T00:00:00");
  const mois = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return mois.charAt(0).toUpperCase() + mois.slice(1);
}

function formatMontant(montant: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(montant);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// ================================================================
// TEMPLATE EMAIL REÇU
// ================================================================

function genererRecuEmail(params: {
  locataire_prenom: string;
  locataire_nom: string;
  annonce_titre: string;
  annonce_ville: string;
  annonce_adresse?: string;
  mois: string;
  montant: number;
  type: "mensuel" | "impaye" | "initial";
  reference: string;
  date_paiement: string;
  proprietaire_nom?: string;
}): { subject: string; html: string } {
  const moisFormate = formatMois(params.mois);
  const montantFormate = formatMontant(params.montant);
  const dateFormatee = formatDate(params.date_paiement);

  // Adapter le sujet selon le type
  let subject: string;
  let titreRecu: string;
  let descriptionType: string;

  switch (params.type) {
    case "impaye":
      subject = `STERNY — Reçu de paiement (régularisation ${moisFormate})`;
      titreRecu = "Reçu de paiement";
      descriptionType = `Régularisation du loyer de ${moisFormate}`;
      break;
    case "initial":
      subject = `STERNY — Reçu : prélèvement SEPA mis en place`;
      titreRecu = "Confirmation de mise en place";
      descriptionType = "Prélèvement SEPA activé";
      break;
    default:
      subject = `STERNY — Reçu de loyer — ${moisFormate}`;
      titreRecu = "Reçu de loyer";
      descriptionType = `Loyer du mois de ${moisFormate}`;
  }

  const adresseLogement = params.annonce_adresse
    ? `${params.annonce_adresse}, ${params.annonce_ville}`
    : `${params.annonce_titre} à ${params.annonce_ville}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #e9eaec; font-family: Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e9eaec;">
    <tr>
      <td style="padding: 24px 0;">
        <table width="520" cellpadding="0" cellspacing="0" align="center" style="background: #ffffff; border: 1px solid #d4d4d8; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 28px 32px 20px;">
              <img src="${LOGO_URL}" alt="STERNY" style="height: 52px; width: auto;" />
            </td>
          </tr>

          <!-- Bandeau succès -->
          <tr>
            <td style="padding: 0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #10B981, #34D399); border-radius: 10px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 28px;">&#x2705;</p>
                    <p style="margin: 0; font-size: 16px; font-weight: 700; color: #ffffff;">${titreRecu}</p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">${descriptionType}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td style="padding: 24px 32px 28px;">
              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 20px;">
                Bonjour ${params.locataire_prenom},
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 24px;">
                Nous confirmons la bonne réception de votre paiement. Voici le détail :
              </p>

              <!-- Détails du paiement -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px; border: 1px solid #E8EAF0; border-radius: 10px; overflow: hidden;">
                <tr>
                  <td style="background: #F8F9FC; padding: 14px 16px; border-bottom: 1px solid #E8EAF0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Logement</td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #1E293B;">${adresseLogement}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${params.proprietaire_nom ? `
                <tr>
                  <td style="background: #FFFFFF; padding: 14px 16px; border-bottom: 1px solid #E8EAF0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Propriétaire</td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #1E293B;">${params.proprietaire_nom}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ""}
                <tr>
                  <td style="background: #FFFFFF; padding: 14px 16px; border-bottom: 1px solid #E8EAF0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Période</td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #1E293B;">${moisFormate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: #FFFFFF; padding: 14px 16px; border-bottom: 1px solid #E8EAF0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748B;">Date de paiement</td>
                        <td align="right" style="font-size: 13px; font-weight: 600; color: #1E293B;">${dateFormatee}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: #F0FDF4; padding: 14px 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 14px; font-weight: 700; color: #166534;">Montant payé</td>
                        <td align="right" style="font-size: 16px; font-weight: 800; color: #166534;">${montantFormate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Référence -->
              <p style="font-size: 11px; color: #94A3B8; margin: 0 0 24px; text-align: center;">
                Référence : ${params.reference}
              </p>

              <!-- Note conserve -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 14px 16px;">
                    <p style="margin: 0; font-size: 13px; color: #9A3412; line-height: 1.5;">
                      <strong>Conservez ce reçu</strong> — il pourra vous être demandé comme justificatif.
                      Vous pouvez également télécharger vos quittances de loyer depuis votre espace STERNY.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${BASE_URL}/dashboard-locataire.html" style="display: inline-block; background: #E8622A; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      Voir mon espace
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 16px 32px; border-top: 1px solid #eaebed;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                STERNY &mdash; Le logement pensé pour les alternants
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #bbb;">
                Ce reçu est généré automatiquement. Il ne constitue pas une facture au sens fiscal.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ================================================================
// HANDLER PRINCIPAL
// ================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      locataire_email,
      locataire_prenom,
      locataire_nom,
      annonce_titre,
      annonce_ville,
      annonce_adresse,
      mois,
      montant,
      type,        // "mensuel" | "impaye" | "initial"
      reference,
      date_paiement,
      proprietaire_nom,
    } = body;

    if (!locataire_email || !mois || !montant) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants: locataire_email, mois, montant requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Générer le reçu
    const { subject, html } = genererRecuEmail({
      locataire_prenom: locataire_prenom || "Locataire",
      locataire_nom: locataire_nom || "",
      annonce_titre: annonce_titre || "Votre logement",
      annonce_ville: annonce_ville || "",
      annonce_adresse,
      mois,
      montant,
      type: type || "mensuel",
      reference: reference || `STERNY-${Date.now()}`,
      date_paiement: date_paiement || new Date().toISOString(),
      proprietaire_nom,
    });

    // Envoyer via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "STERNY <noreply@sterny.co>",
        to: [locataire_email],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Erreur envoi email", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Reçu envoyé à ${locataire_email}: ${resendData.id} — ${montant}€ (${type || "mensuel"})`);

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
