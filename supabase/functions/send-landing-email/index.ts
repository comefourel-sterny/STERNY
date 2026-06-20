// Supabase Edge Function : send-landing-email
// Email de bienvenue envoyé depuis la landing page
// Secret requis : RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const htmlEmail = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
</head>
<body style="margin:0; padding:0; background-color:#F4F5F7; font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F5F7; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="460" cellpadding="0" cellspacing="0" style="width:460px; max-width:460px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="background-color:#1E293B; padding:34px 32px 30px;">
              <img src="https://rkffpmuhyvwwgfbdqmqr.supabase.co/storage/v1/object/public/public-assets/Logo-Sterny-V1-white.png" alt="STERNY" width="134" height="44" style="display:block; width:134px; height:44px; border:0; outline:none; text-decoration:none;" />
              <div style="width:32px; height:3px; background-color:#E8622A; border-radius:2px; margin:13px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:36px 30px 32px; text-align:center;">
              <h1 style="margin:0 0 18px; font-size:21px; font-weight:700; color:#1E293B;">Bienvenue !</h1>
              <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:#475569;">Merci pour ton inscription !</p>
              <p style="margin:0; font-size:15px; line-height:1.6; color:#E8622A; font-weight:500;">On te préviendra dès le lancement de STERNY.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 30px; border-top:1px solid #EEF1F5; text-align:center;">
              <p style="margin:0; font-size:12px; color:#94A3B8;">STERNY — Le logement pensé pour les alternants</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="460" cellpadding="0" cellspacing="0" style="width:460px; max-width:460px;">
          <tr>
            <td align="center" style="padding:22px 16px 6px; text-align:center;">
              <p style="margin:0; font-size:13px; line-height:1.5; color:#94A3B8;">Tu n'as pas demandé à être prévenu ? Ignore simplement cet email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "STERNY <noreply@sterny.co>",
        to: [email],
        subject: "Merci ! On te prévient dès le lancement de STERNY",
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

    // --- Notification admin (non bloquante) : ping Discord. N'affecte jamais l'inscription ni le mail de bienvenue. ---
    const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (discordWebhookUrl) {
      try {
        await fetch(discordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "🎉 Nouvelle inscription sur la waitlist Sterny",
          }),
        });
      } catch (notifError) {
        console.error("Notif Discord échouée (ignorée) :", notifError);
      }
    }
    // --- fin notification admin ---

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
