// Supabase Edge Function : export-data
// Exporte toutes les données personnelles de l'utilisateur (RGPD)
// À déployer : supabase functions deploy export-data
// L'utilisateur doit être authentifié (token Bearer dans le header)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client avec le token utilisateur
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Client admin pour lire toutes les données
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── Collecter toutes les données ──

    // Profil utilisateur
    const { data: profil } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    // Candidatures
    const { data: candidatures } = await supabaseAdmin
      .from("candidatures")
      .select("*")
      .eq("locataire_id", userId);

    // Annonces (si propriétaire)
    const { data: annonces } = await supabaseAdmin
      .from("annonces")
      .select("*")
      .eq("proprietaire_id", userId);

    // Alertes
    const { data: alertes } = await supabaseAdmin
      .from("alertes")
      .select("*")
      .eq("user_id", userId);

    // Favoris
    const { data: favoris } = await supabaseAdmin
      .from("favoris")
      .select("*")
      .eq("user_id", userId);

    // Messages envoyés
    const { data: messagesSent } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("expediteur_id", userId);

    // Matchs
    const { data: matchs } = await supabaseAdmin
      .from("matchs")
      .select("*")
      .or(`locataire_id.eq.${userId},proprietaire_id.eq.${userId}`);

    // Compiler le rapport
    const exportData = {
      export_date: new Date().toISOString(),
      user_email: user.email,
      user_id: userId,
      profil: profil || null,
      candidatures: candidatures || [],
      annonces: annonces || [],
      alertes: alertes || [],
      favoris: favoris || [],
      messages_envoyes: messagesSent || [],
      matchs: matchs || [],
    };

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="sterny-export-${new Date().toISOString().split("T")[0]}.json"`,
        },
      }
    );

  } catch (error) {
    console.error("Erreur export-data:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
