// Supabase Edge Function : send-alert-email
// À déployer dans : Dashboard > Edge Functions > Create > "send-alert-email"
// Secret requis : RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, ville, rythme } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construire le contenu personnalisé
    const villeText = ville ? ville.charAt(0).toUpperCase() + ville.slice(1) : null;
    const criteresHtml = villeText
      ? `<p style="font-size: 14px; color: #64748B; margin: 0;">Tes critères : <strong style="color: #1E293B;">${villeText}</strong>${rythme ? ` — Rythme <strong style="color: #1E293B;">${rythme}</strong>` : ""}</p>`
      : "";

    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F1F5F9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="background: #1E293B; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #FFFFFF; letter-spacing: 1px;">STERNY</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #1E293B;">Ton alerte est activée !</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                On te préviendra par email dès qu'un logement correspondant à tes critères sera disponible.
              </p>
              ${criteresHtml ? `
              <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin: 0 0 24px; border-left: 3px solid #FF6B35;">
                ${criteresHtml}
              </div>
              ` : ""}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 28px;">
                    <a href="https://sterny.co/recherche.html" style="display: inline-block; background: #FF6B35; color: #FFFFFF; text-decoration: none; padding: 14px 48px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      Voir les annonces
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 13px; line-height: 1.5; color: #CBD5E1; margin: 0; text-align: center;">
                Tu n'as pas créé cette alerte ? Ignore cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #F1F5F9;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center;">
                STERNY — Le logement pensé pour les alternants
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Envoyer via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "STERNY <noreply@sterny.co>",
        to: [email],
        subject: "STERNY — Ton alerte est activée",
        html: htmlEmail,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return new Response(JSON.stringify({ error: "Erreur envoi email", details: resendData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
