// Supabase Edge Function : expire-candidatures
// Expire les candidatures "en_attente" sans réponse depuis plus de 14 jours
// À déclencher via un cron Supabase (pg_cron) ou un appel planifié
// Déployer : supabase functions deploy expire-candidatures

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Date limite : 14 jours dans le passé
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - 14);

    // Mettre à jour toutes les candidatures en_attente créées il y a plus de 14 jours
    const { data, error } = await supabaseAdmin
      .from("candidatures")
      .update({ statut: "expiree" })
      .eq("statut", "en_attente")
      .lt("created_at", dateLimite.toISOString())
      .select("id");

    if (error) throw error;

    const count = data?.length || 0;

    return new Response(
      JSON.stringify({
        success: true,
        message: `${count} candidature(s) expirée(s)`,
        expired_count: count,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erreur expire-candidatures:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
