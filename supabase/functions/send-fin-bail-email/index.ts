// Supabase Edge Function : send-fin-bail-email
// Envoie les emails de rappel de fin de bail au locataire ET au propriétaire
// À déployer dans : Dashboard > Edge Functions > Create > "send-fin-bail-email"
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
// TEMPLATES EMAIL
// ================================================================

function genererEmailLocataire(params: {
  type: string;
  locataire_prenom: string;
  annonce_titre: string;
  annonce_ville: string;
  date_fin: string;
  loyer: number;
  jours_restants: number;
  contrat_id: string;
  renouvellement_en_cours: boolean;
  est_alternance: boolean;
  co_alternant_prenom?: string;
}): { subject: string; html: string } {
  const dateFinFormatee = new Date(params.date_fin).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isUrgent = params.type === "rappel_15j";

  const subject = isUrgent
    ? `STERNY — Plus que ${params.jours_restants} jours avant la fin de ton bail`
    : `STERNY — Ton bail se termine dans ${params.jours_restants} jours`;

  // Texte principal
  const texteIntro = `Ton bail pour <strong>${params.annonce_titre}</strong> &agrave; <strong>${params.annonce_ville}</strong> prend fin le <strong>${dateFinFormatee}</strong>, soit dans <strong style="color: ${isUrgent ? '#DC2626' : '#FF6B35'};">${params.jours_restants} jours</strong>.`;

  // Texte secondaire selon contexte
  let texteSecondaire = "";
  if (params.renouvellement_en_cours) {
    texteSecondaire = `Ta demande de renouvellement est en cours de traitement. Tu peux suivre son statut depuis ton espace.`;
  } else if (isUrgent) {
    texteSecondaire = `Si tu souhaites rester, fais une demande de renouvellement d&egrave;s maintenant. Sinon, pense &agrave; chercher un nouveau logement pour ne pas te retrouver sans solution.`;
  } else {
    texteSecondaire = `Si tu souhaites rester, tu peux demander un renouvellement. Ton propri&eacute;taire sera notifi&eacute; automatiquement.`;
  }

  // Mention alternance
  if (params.est_alternance && params.co_alternant_prenom && !params.renouvellement_en_cours) {
    texteSecondaire += ` Tu alternes ce logement avec <strong>${params.co_alternant_prenom}</strong> — si tu souhaites continuer l'alternance, pense &agrave; renouveler.`;
  }

  // CTA
  const ctaLabel = params.renouvellement_en_cours ? "Voir le statut de ma demande" : "Demander un renouvellement";
  const ctaUrl = `${BASE_URL}/renouvellement.html?contrat_id=${params.contrat_id}`;

  // Bouton secondaire (15j sans renouvellement)
  const boutonSecondaire = (isUrgent && !params.renouvellement_en_cours) ? `
                <tr>
                  <td align="center" style="padding: 10px 0 0;">
                    <a href="${BASE_URL}/recherche.html" style="display: inline-block; background: #fff; color: #333; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; border: 1px solid #ddd;">
                      Rechercher un autre logement
                    </a>
                  </td>
                </tr>` : "";

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
                ${texteIntro}
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 20px;">
                ${texteSecondaire}
              </p>

              <p style="font-size: 12px; line-height: 1.5; color: #999; margin: 0 0 24px;">
                Conform&eacute;ment &agrave; l'art. 25-7 de la loi du 6 juillet 1989, le bail &eacute;tudiant ne se renouvelle pas par reconduction tacite.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background: #FF6B35; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>${boutonSecondaire}
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
  type: string;
  proprietaire_prenom: string;
  locataire_prenom: string;
  annonce_titre: string;
  annonce_ville: string;
  date_fin: string;
  loyer: number;
  jours_restants: number;
  contrat_id: string;
  renouvellement_en_cours: boolean;
  est_alternance: boolean;
  co_alternant_prenom?: string;
}): { subject: string; html: string } {
  const dateFinFormatee = new Date(params.date_fin).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isUrgent = params.type === "rappel_15j";

  const subject = isUrgent
    ? `STERNY — Fin de bail dans ${params.jours_restants} jours pour votre logement`
    : params.renouvellement_en_cours
      ? `STERNY — ${params.locataire_prenom} a demand\u00e9 un renouvellement de bail`
      : `STERNY — Le bail de ${params.locataire_prenom} se termine dans ${params.jours_restants} jours`;

  // Texte principal
  let texteIntro = "";
  if (params.renouvellement_en_cours) {
    texteIntro = `<strong>${params.locataire_prenom}</strong> souhaite renouveler son bail pour votre logement <strong>${params.annonce_titre}</strong> &agrave; <strong>${params.annonce_ville}</strong>. Le bail actuel prend fin le <strong>${dateFinFormatee}</strong>.`;
  } else {
    texteIntro = `Le bail de <strong>${params.locataire_prenom}</strong> pour votre logement <strong>${params.annonce_titre}</strong> &agrave; <strong>${params.annonce_ville}</strong> prend fin le <strong>${dateFinFormatee}</strong>, soit dans <strong style="color: ${isUrgent ? '#DC2626' : '#FF6B35'};">${params.jours_restants} jours</strong>.`;
  }

  // Texte secondaire
  let texteSecondaire = "";
  if (params.renouvellement_en_cours) {
    texteSecondaire = `Vous pouvez accepter ou refuser cette demande depuis votre espace propri&eacute;taire.`;
  } else if (isUrgent) {
    texteSecondaire = `${params.locataire_prenom} n'a pas encore demand&eacute; de renouvellement. Pensez &agrave; remettre votre annonce en ligne pour trouver un nouveau locataire.`;
  } else {
    texteSecondaire = `Votre locataire n'a pas encore fait de demande de renouvellement. Nous vous tiendrons inform&eacute; s'il en fait une. En cas de non-renouvellement, pensez &agrave; remettre votre annonce en ligne.`;
  }

  // Mention alternance
  if (params.est_alternance && params.co_alternant_prenom) {
    texteSecondaire += ` Ce logement est en alternance : ${params.locataire_prenom} termine, ${params.co_alternant_prenom} reste. Si ${params.locataire_prenom} ne renouvelle pas, nous vous proposerons de trouver un rempla&ccedil;ant.`;
  }

  // CTA
  const ctaLabel = params.renouvellement_en_cours ? "Voir la demande de renouvellement" : "G&eacute;rer mon annonce";
  const ctaUrl = params.renouvellement_en_cours
    ? `${BASE_URL}/renouvellement.html?contrat_id=${params.contrat_id}`
    : `${BASE_URL}/dashboard-proprietaire.html`;

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
                ${texteIntro}
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 24px;">
                ${texteSecondaire}
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background: #FF6B35; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600;">
                      ${ctaLabel}
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

function genererEmailCoAlternant(params: {
  co_alternant_prenom: string;
  co_alternant_email: string;
  locataire_prenom: string;
  annonce_titre: string;
  annonce_ville: string;
  date_fin: string;
  jours_restants: number;
  contrat_id: string;
}): { subject: string; html: string } {
  const dateFinFormatee = new Date(params.date_fin).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = `STERNY — Le bail de ${params.locataire_prenom} se termine dans ${params.jours_restants} jours`;

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
              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 16px;">Salut ${params.co_alternant_prenom},</p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 20px;">
                Le bail de <strong>${params.locataire_prenom}</strong>, avec qui tu alternes le logement <strong>${params.annonce_titre}</strong> &agrave; <strong>${params.annonce_ville}</strong>, se termine le <strong>${dateFinFormatee}</strong> (dans <strong style="color: #FF6B35;">${params.jours_restants} jours</strong>).
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #333; margin: 0 0 24px;">
                Pas d'inqui&eacute;tude : si ${params.locataire_prenom} ne renouvelle pas, nous chercherons un nouveau co-alternant pour toi. Tu peux aussi demander &agrave; passer en bail &agrave; temps plein.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${BASE_URL}/dashboard-locataire.html" style="display: inline-block; background: #FF6B35; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600;">
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
      console.error(`❌ Resend error pour ${to}:`, data);
      return false;
    }
    console.log(`✅ Email envoyé à ${to}: ${data.id}`);
    return true;
  } catch (err) {
    console.error(`❌ Erreur envoi à ${to}:`, err);
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
      type,
      locataire_email,
      locataire_prenom,
      proprietaire_email,
      proprietaire_prenom,
      contrat_id,
      annonce_titre,
      annonce_ville,
      date_fin,
      loyer,
      jours_restants,
      renouvellement_en_cours = false,
      est_alternance = false,
      co_alternant_prenom,
      co_alternant_email,
    } = body;

    if (!locataire_email || !proprietaire_email || !type) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants: locataire_email, proprietaire_email, type requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { to: string; success: boolean }[] = [];

    // 1. Email au locataire
    const emailLocataire = genererEmailLocataire({
      type,
      locataire_prenom,
      annonce_titre,
      annonce_ville,
      date_fin,
      loyer,
      jours_restants,
      contrat_id,
      renouvellement_en_cours,
      est_alternance,
      co_alternant_prenom,
    });

    const locOk = await envoyerEmail(locataire_email, emailLocataire.subject, emailLocataire.html);
    results.push({ to: locataire_email, success: locOk });

    // 2. Email au propriétaire
    const emailProprio = genererEmailProprietaire({
      type,
      proprietaire_prenom,
      locataire_prenom,
      annonce_titre,
      annonce_ville,
      date_fin,
      loyer,
      jours_restants,
      contrat_id,
      renouvellement_en_cours,
      est_alternance,
      co_alternant_prenom,
    });

    const propOk = await envoyerEmail(proprietaire_email, emailProprio.subject, emailProprio.html);
    results.push({ to: proprietaire_email, success: propOk });

    // 3. Email au co-alternant (si applicable)
    if (est_alternance && co_alternant_email && co_alternant_prenom) {
      const emailCoAlt = genererEmailCoAlternant({
        co_alternant_prenom,
        co_alternant_email,
        locataire_prenom,
        annonce_titre,
        annonce_ville,
        date_fin,
        jours_restants,
        contrat_id,
      });

      const coAltOk = await envoyerEmail(co_alternant_email, emailCoAlt.subject, emailCoAlt.html);
      results.push({ to: co_alternant_email, success: coAltOk });
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
