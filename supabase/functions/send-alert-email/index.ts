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
  <style>
    @media only screen and (max-width: 520px) {
      .email-card { width: 100% !important; border-radius: 0 !important; }
      .email-body { padding: 28px 20px 24px !important; }
      .email-header { padding: 24px 20px 12px !important; }
      .email-footer { padding: 16px 20px !important; }
      .email-btn { padding: 12px 32px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #1E293B; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1E293B; padding: 40px 16px;">
    <tr>
      <td align="center" style="padding-bottom: 24px;">
        <img src="https://rkffpmuhyvwwgfbdqmqr.supabase.co/storage/v1/object/public/public-assets/Logo-Sterny-V1.png" alt="STERNY" style="height: 36px; width: auto;" />
      </td>
    </tr>
    <tr>
      <td align="center">
        <table class="email-card" width="480" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; max-width: 480px; width: 100%;">
          <tr>
            <td class="email-body" style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #1E293B; text-align: center;">Ton alerte est activée !</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #64748B; margin: 0 0 20px; text-align: center;">
                On te préviendra dès qu'un logement correspondant à tes critères sera disponible.
              </p>
              ${criteresHtml ? `
              <div style="background: #F8FAFC; border-radius: 10px; padding: 14px 16px; margin: 0 0 20px; border-left: 3px solid #E8622A;">
                ${criteresHtml}
              </div>
              ` : ""}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 4px 0 24px;">
                    <a class="email-btn" href="https://sterny.co/recherche" style="display: inline-block; background: #E8622A; color: #FFFFFF; text-decoration: none; padding: 13px 40px; border-radius: 10px; font-size: 14px; font-weight: 600;">
                      Voir les annonces
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; line-height: 1.5; color: #CBD5E1; margin: 0; text-align: center;">
                Tu n'as pas créé cette alerte ? Ignore cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="padding: 16px 32px; border-top: 1px solid #F1F5F9;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; text-align: center;">
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
