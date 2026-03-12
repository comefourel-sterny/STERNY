// Supabase Edge Function : create-stripe-portal
// Crée une session Stripe Customer Portal pour permettre au locataire
// de gérer/modifier sa méthode de paiement SEPA (RIB/IBAN).
// À déployer dans : Dashboard > Edge Functions > Create > "create-stripe-portal"
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier le JWT
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

    const { contrat_id, return_url } = await req.json();

    if (!contrat_id) {
      return new Response(
        JSON.stringify({ error: "contrat_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer le contrat ET vérifier que l'utilisateur est le locataire
    const { data: contrat, error: contratError } = await supabase
      .from("contrats")
      .select("stripe_customer_id, locataire_id")
      .eq("id", contrat_id)
      .single();

    if (!contratError && contrat && contrat.locataire_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Accès non autorisé à ce contrat" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (contratError || !contrat) {
      return new Response(
        JSON.stringify({ error: "Contrat non trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!contrat.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Aucun compte Stripe associé à ce contrat. Le prélèvement SEPA n'a pas encore été mis en place." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer la session Customer Portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: contrat.stripe_customer_id,
      return_url: return_url || "https://sterny.co/dashboard-locataire.html",
    });

    console.log(`Portal session créée pour customer ${contrat.stripe_customer_id}: ${portalSession.url}`);

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur création portal:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
