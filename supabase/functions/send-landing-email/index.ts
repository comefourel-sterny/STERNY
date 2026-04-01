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
            <td style="padding: 32px 32px 16px; text-align: center;">
              <img src="https://rkffpmuhyvwwgfbdqmqr.supabase.co/storage/v1/object/public/public-assets/Logo-Sterny-V1.png" alt="STERNY" style="height: 48px; width: auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #1E293B;">Bienvenue sur STERNY !</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                Merci pour ton inscription ! Tu fais partie des premiers à découvrir STERNY, la plateforme de mise en relation entre étudiants en alternance pour trouver leur logement à leur rythme.
              </p>
              <div style="background: #F8FAFC; border-radius: 8px; padding: 16px; margin: 0 0 24px; border-left: 3px solid #FF6B35;">
                <p style="font-size: 14px; color: #64748B; margin: 0;">Tu seras <strong style="color: #1E293B;">prévenu en avant-première</strong> dès le lancement de la plateforme.</p>
              </div>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                En attendant, on prépare tout pour te proposer la meilleure expérience possible. Reste connecté !
              </p>
              <p style="font-size: 13px; line-height: 1.5; color: #CBD5E1; margin: 0; text-align: center;">
                Tu n'as pas demandé à être prévenu ? Ignore simplement cet email.
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

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "STERNY <noreply@sterny.co>",
        to: [email],
        subject: "Bienvenue sur STERNY — Tu seras prévenu au lancement !",
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
