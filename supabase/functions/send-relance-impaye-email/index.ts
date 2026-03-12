// Supabase Edge Function : send-relance-impaye-email
// Envoie les emails de relance d'impayé au locataire, au propriétaire et au garant
// À déployer dans : Dashboard > Edge Functions > Create > "send-relance-impaye-email"
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

// ================================================================
// TEMPLATES EMAIL
// ================================================================

function genererEmailLocataire(params: {
  locataire_prenom: string;
  annonce_titre: string;
  annonce_ville: string;
  mois: string;
  montant: number;
  contrat_id: string;
}): { subject: string; html: string } {
  const moisFormate = formatMois(params.mois);
  const montantFormate = formatMontant(params.montant);

  const subject = `STERNY — Loyer impay\u00e9 pour ${moisFormate}`;

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

          <!-- Contenu -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 16px;">Salut ${params.locataire_prenom},</p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 20px;">
                Ton loyer de <strong style="color: #DC2626;">${montantFormate}</strong> pour le mois de <strong>${moisFormate}</strong> concernant le logement <strong>${params.annonce_titre}</strong> &agrave; <strong>${params.annonce_ville}</strong> n'a pas encore &eacute;t&eacute; r&eacute;gl&eacute;.
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 20px;">
                Merci de r&eacute;gulariser ta situation dans les plus brefs d&eacute;lais. Si le paiement a d&eacute;j&agrave; &eacute;t&eacute; effectu&eacute;, tu peux ignorer ce message.
              </p>

              <p style="font-size: 12px; line-height: 1.5; color: #999; margin: 0 0 24px;">
                En l'absence de r&eacute;gularisation, ton garant sera automatiquement contact&eacute; conform&eacute;ment &agrave; l'acte de cautionnement sign&eacute;.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${BASE_URL}/paiement-initial.html?type=impaye&contrat_id=${params.contrat_id}&mois=${params.mois}" style="display: inline-block; background: #FF6B35; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600;">
                      R&eacute;gulariser mon loyer
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
                STERNY &mdash; Le logement pens&eacute; pour les alternants
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

function genererEmailProprietaire(params: {
  proprietaire_prenom: string;
  locataire_prenom: string;
  locataire_nom: string;
  annonce_titre: string;
  annonce_ville: string;
  mois: string;
  montant: number;
  garant_prenom?: string;
  garant_nom?: string;
  garant_email?: string;
  garant_telephone?: string;
}): { subject: string; html: string } {
  const moisFormate = formatMois(params.mois);
  const montantFormate = formatMontant(params.montant);

  const subject = `STERNY — Loyer impay\u00e9 de ${params.locataire_prenom} ${params.locataire_nom} (${moisFormate})`;

  // Bloc garant
  let garantInfo = "";
  if (params.garant_prenom && params.garant_email) {
    garantInfo = `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 0;">
                <tr>
                  <td style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px;">
                    <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #166534; margin: 0 0 8px; font-weight: 600;">Garant notifi&eacute;</p>
                    <p style="font-size: 14px; color: #333; margin: 0; font-weight: 500;">${params.garant_prenom} ${params.garant_nom || ""}</p>
                    <p style="font-size: 13px; color: #666; margin: 4px 0 0;">
                      ${params.garant_email}${params.garant_telephone ? " &middot; " + params.garant_telephone : ""}
                    </p>
                  </td>
                </tr>
              </table>`;
  }

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

          <!-- Contenu -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 16px;">Bonjour ${params.proprietaire_prenom},</p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 20px;">
                Le loyer de <strong>${params.locataire_prenom} ${params.locataire_nom}</strong> d'un montant de <strong style="color: #DC2626;">${montantFormate}</strong> pour le mois de <strong>${moisFormate}</strong> concernant le logement <strong>${params.annonce_titre}</strong> &agrave; <strong>${params.annonce_ville}</strong> n'a pas &eacute;t&eacute; pay&eacute;.
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 0;">
                Le locataire et son garant ont &eacute;t&eacute; notifi&eacute;s par email.
              </p>

              ${garantInfo}

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 0;">
                <tr>
                  <td align="center">
                    <a href="${BASE_URL}/dashboard-proprietaire.html" style="display: inline-block; background: #FF6B35; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600;">
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
                STERNY &mdash; Le logement pens&eacute; pour les alternants
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

function genererEmailGarant(params: {
  garant_prenom: string;
  locataire_prenom: string;
  locataire_nom: string;
  annonce_titre: string;
  annonce_ville: string;
  mois: string;
  montant: number;
}): { subject: string; html: string } {
  const moisFormate = formatMois(params.mois);
  const montantFormate = formatMontant(params.montant);

  const subject = `STERNY — Loyer impay\u00e9 de ${params.locataire_prenom} ${params.locataire_nom} — Action requise`;

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

          <!-- Contenu -->
          <tr>
            <td style="padding: 0 32px 28px;">
              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 16px;">Bonjour ${params.garant_prenom},</p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 20px;">
                Nous vous contactons en tant que garant de <strong>${params.locataire_prenom} ${params.locataire_nom}</strong>.
              </p>

              <!-- Encart impayé -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">
                <tr>
                  <td style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px;">
                    <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #991B1B; margin: 0 0 8px; font-weight: 600;">Loyer impay&eacute;</p>
                    <p style="font-size: 14px; color: #333; margin: 0; line-height: 1.6;">
                      Logement : <strong>${params.annonce_titre}</strong> &agrave; ${params.annonce_ville}<br/>
                      Mois : <strong>${moisFormate}</strong><br/>
                      Montant : <strong style="color: #DC2626;">${montantFormate}</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 20px;">
                Conform&eacute;ment &agrave; l'acte de cautionnement que vous avez sign&eacute;, vous vous &ecirc;tes port&eacute;(e) garant(e) du paiement du loyer de ${params.locataire_prenom}. Le loyer du mois de ${moisFormate} n'ayant pas &eacute;t&eacute; r&eacute;gl&eacute;, nous vous prions de bien vouloir proc&eacute;der au r&egrave;glement.
              </p>

              <p style="font-size: 12px; line-height: 1.5; color: #999; margin: 0 0 24px;">
                Si ${params.locataire_prenom} a d&eacute;j&agrave; r&eacute;gularis&eacute; sa situation, vous pouvez ignorer ce message.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="mailto:contact@sterny.co?subject=Impay%C3%A9%20${encodeURIComponent(params.locataire_prenom + " " + params.locataire_nom)}%20-%20${encodeURIComponent(moisFormate)}" style="display: inline-block; background: #FF6B35; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600;">
                      Nous contacter
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
                STERNY &mdash; Le logement pens&eacute; pour les alternants
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
// ENVOI VIA RESEND
// ================================================================
async function envoyerEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "STERNY <noreply@sterny.co>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`Resend error pour ${to}:`, data);
      return false;
    }
    console.log(`Email envoyé à ${to}: ${data.id}`);
    return true;
  } catch (err) {
    console.error(`Erreur envoi à ${to}:`, err);
    return false;
  }
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
      proprietaire_email,
      proprietaire_prenom,
      garant_email,
      garant_prenom,
      garant_nom,
      garant_telephone,
      annonce_titre,
      annonce_ville,
      mois,
      montant,
      contrat_id,
    } = body;

    if (!locataire_email || !proprietaire_email || !mois || !montant) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants: locataire_email, proprietaire_email, mois, montant requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { to: string; role: string; success: boolean }[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // 1. Email au locataire
    const emailLoc = genererEmailLocataire({
      locataire_prenom,
      annonce_titre,
      annonce_ville,
      mois,
      montant,
      contrat_id,
    });
    const locOk = await envoyerEmail(locataire_email, emailLoc.subject, emailLoc.html);
    results.push({ to: locataire_email, role: "locataire", success: locOk });

    await delay(1500);

    // 2. Email au propriétaire
    const emailProp = genererEmailProprietaire({
      proprietaire_prenom,
      locataire_prenom,
      locataire_nom,
      annonce_titre,
      annonce_ville,
      mois,
      montant,
      garant_prenom,
      garant_nom,
      garant_email,
      garant_telephone,
    });
    const propOk = await envoyerEmail(proprietaire_email, emailProp.subject, emailProp.html);
    results.push({ to: proprietaire_email, role: "proprietaire", success: propOk });

    await delay(1500);

    // 3. Email au garant (si email disponible)
    if (garant_email && garant_prenom) {
      const emailGar = genererEmailGarant({
        garant_prenom,
        locataire_prenom,
        locataire_nom,
        annonce_titre,
        annonce_ville,
        mois,
        montant,
      });
      const garOk = await envoyerEmail(garant_email, emailGar.subject, emailGar.html);
      results.push({ to: garant_email, role: "garant", success: garOk });
    } else {
      console.log("Pas d'email garant — notification garant non envoyée");
    }

    const allOk = results.every((r) => r.success);

    return new Response(
      JSON.stringify({ success: allOk, results }),
      {
        status: allOk ? 200 : 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
