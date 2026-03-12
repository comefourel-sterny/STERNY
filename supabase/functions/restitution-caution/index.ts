// Supabase Edge Function : restitution-caution
// Gère la restitution du dépôt de garantie via Stripe Refund
// Appelée par le propriétaire après fin de contrat / résiliation
// Secrets requis : STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier le token utilisateur
    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { restitution_id, action } = body;
    // action = "initier" (propriétaire) | "accepter" (locataire) | "contester" (locataire)

    if (!restitution_id || !action) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Récupérer la restitution
    const { data: restitution, error: restError } = await supabaseClient
      .from("restitutions_caution")
      .select("*")
      .eq("id", restitution_id)
      .single();

    if (restError || !restitution) {
      return new Response(
        JSON.stringify({ error: "Restitution non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que l'utilisateur est une des parties
    if (user.id !== restitution.proprietaire_id && user.id !== restitution.locataire_id) {
      return new Response(
        JSON.stringify({ error: "Accès non autorisé" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: Record<string, unknown> = {};

    if (action === "accepter" && user.id === restitution.locataire_id) {
      // Le locataire accepte → procéder au remboursement Stripe
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

      // Récupérer le paiement initial pour le refund
      const { data: contrat } = await supabaseClient
        .from("contrats")
        .select("stripe_payment_intent_id")
        .eq("id", restitution.contrat_id)
        .single();

      if (contrat?.stripe_payment_intent_id && restitution.montant_restitue > 0) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: contrat.stripe_payment_intent_id,
            amount: Math.round(restitution.montant_restitue * 100), // Stripe en centimes
            reason: "requested_by_customer",
            metadata: {
              restitution_id: restitution.id,
              contrat_id: restitution.contrat_id,
            },
          });

          await supabaseClient
            .from("restitutions_caution")
            .update({
              statut: "remboursee",
              stripe_refund_id: refund.id,
            })
            .eq("id", restitution_id);

          result = { success: true, message: "Remboursement effectué", refund_id: refund.id };
        } catch (stripeErr) {
          console.error("Erreur Stripe refund:", stripeErr);
          // Marquer comme acceptée même si Stripe échoue (traitement manuel nécessaire)
          await supabaseClient
            .from("restitutions_caution")
            .update({ statut: "acceptee" })
            .eq("id", restitution_id);

          result = {
            success: true,
            message: "Acceptée. Le remboursement sera traité manuellement.",
            stripe_error: true
          };
        }
      } else {
        // Pas de payment_intent ou montant 0 → juste marquer comme acceptée
        await supabaseClient
          .from("restitutions_caution")
          .update({ statut: "acceptee" })
          .eq("id", restitution_id);

        result = { success: true, message: "Restitution acceptée" };
      }

    } else if (action === "contester" && user.id === restitution.locataire_id) {
      // Le locataire conteste
      const motifContestation = body.motif_contestation || "";

      await supabaseClient
        .from("restitutions_caution")
        .update({ statut: "contestee" })
        .eq("id", restitution_id);

      // Notifier le propriétaire par message
      await supabaseClient
        .from("messages")
        .insert({
          expediteur_id: user.id,
          destinataire_id: restitution.proprietaire_id,
          contenu: `⚠️ Contestation de la restitution de caution\n\n${motifContestation || "Le locataire conteste les retenues effectuées."}\n\nMerci de prendre contact pour résoudre ce différend.`,
        });

      result = { success: true, message: "Contestation enregistrée" };

    } else if (action === "initier" && user.id === restitution.proprietaire_id) {
      // Déjà initié lors de la création côté client
      result = { success: true, message: "Restitution déjà initiée" };

    } else {
      return new Response(
        JSON.stringify({ error: "Action non autorisée" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erreur restitution-caution:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
