// Supabase Edge Function : create-stripe-identity-session
// Crée une session Stripe Identity pour vérifier l'identité d'un utilisateur.
// Le locataire scanne sa pièce d'identité via la page Stripe hébergée.
// Après vérification, le webhook met à jour `identite_verifiee = 'verifiee'` dans la table users.
// À déployer dans : Dashboard > Edge Functions > Create > "create-stripe-identity-session"
// Secret requis : STRIPE_SECRET_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@latest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // === VÉRIFICATION AUTHENTIFICATION ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY non configuré");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-12-18.acacia",
    });

    const { user_id, return_url } = await req.json();

    // Vérifier que l'utilisateur demande sa propre vérification
    if (!user_id || user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Accès non autorisé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer la session Stripe Identity
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id,
        plateforme: "STERNY",
      },
      options: {
        document: {
          allowed_types: ["id_card", "passport", "driving_license"],
          require_matching_selfie: true,
        },
      },
      return_url: return_url || "https://sterny.co/dashboard-locataire.html",
    });

    console.log(`Identity session créée: ${verificationSession.id} pour user ${user_id}`);

    return new Response(
      JSON.stringify({
        session_id: verificationSession.id,
        url: verificationSession.url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur création Identity session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
