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
    const { proprietaire_email, alternant_prenom, alternant_nom, invitation_token,
            // Legacy params
            email_proprietaire: legacyEmail, prenom_user, nom_user, ville } = await req.json();

    const email_proprietaire = proprietaire_email || legacyEmail;

    if (!email_proprietaire) {
      return new Response(JSON.stringify({ error: "Email proprietaire requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prenom = alternant_prenom || prenom_user || "";
    const nomVal = alternant_nom || nom_user || "";
    const prenomCapitalized = prenom ? prenom.charAt(0).toUpperCase() + prenom.slice(1) : "";
    const nomCapitalized = nomVal ? nomVal.charAt(0).toUpperCase() + nomVal.slice(1) : "";
    const fullName = `${prenomCapitalized} ${nomCapitalized}`.trim() || "Un locataire";
    const villeText = ville ? ville.charAt(0).toUpperCase() + ville.slice(1) : "";
    const invitationUrl = invitation_token ? `https://sterny.co/invitation/${invitation_token}` : "https://sterny.co/inscription/proprietaire";

    const htmlEmail = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F4F5F7; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F5F7; padding: 40px 20px;">
    <tr>
      <td align="center">

        <!-- CARTE -->
        <table width="520" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 20px; border: 2px solid #E5E7EB; box-shadow: 0 8px 40px rgba(30, 41, 59, 0.08);">

          <!-- Header avec logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 28px;">
              <img src="https://rkffpmuhyvwwgfbdqmqr.supabase.co/storage/v1/object/public/public-assets/Logo-Sterny-V1.png" alt="STERNY" style="height: 48px; width: auto;" />
            </td>
          </tr>

          <!-- S\u00e9parateur -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: #E5E7EB;"></div>
            </td>
          </tr>

          <!-- Contenu -->
          <tr>
            <td style="padding: 32px 40px 40px;">

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.7; color: #64748B;">
                <strong style="color: #1E293B;">${fullName}</strong>${villeText ? `, alternant \u00e0 <strong style="color: #1E293B;">${villeText}</strong>,` : ""} vous invite \u00e0 le rejoindre sur STERNY comme propri\u00e9taire.
              </p>

              <p style="margin: 0 0 36px; font-size: 16px; line-height: 1.7; color: #64748B;">
                D\u00e9couvrez comment fonctionne la plateforme et comment g\u00e9rer la mise en relation avec votre locataire.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${invitationUrl}" style="display: inline-block; background: #E8622A; color: #FFFFFF; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 15px; font-weight: 600;">Rejoindre STERNY</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table width="520" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 24px 20px 0;">
              <p style="margin: 0; font-size: 12px; color: #CBD5E1;">Vous ne connaissez pas ${prenomCapitalized || "cette personne"} ? Ignorez simplement cet email.</p>
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
        to: [email_proprietaire],
        subject: `${fullName} vous invite sur STERNY`,
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
