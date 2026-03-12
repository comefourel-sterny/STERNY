// Supabase Edge Function : create-stripe-checkout
// Crée une session Stripe Checkout pour :
//   - type "initial" : Prélèvement SEPA automatique (dépôt + abonnement mensuel)
//   - type "impaye"  : Paiement ponctuel par carte d'un loyer impayé
// Secrets requis : STRIPE_SECRET_KEY

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

    // Vérifier le JWT de l'utilisateur
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

    const body = await req.json();
    const {
      type,               // 'impaye' ou 'initial'
      contrat_id,
      mois,               // '2026-03-01' (pour impayé)
      paiement_id,        // UUID du paiement (pour impayé)
      montant,            // Montant total en euros
      depot,              // Dépôt de garantie (initial uniquement)
      loyer_mensuel,      // Loyer mensuel calculé (initial)
      commission_mensuelle, // Commission mensuelle (initial)
      loyer,              // Part de loyer ponctuel (impayé)
      commission,         // Commission ponctuelle (impayé)
      locataire_nom,
      locataire_prenom,
      locataire_email,
      locataire_id,
      hote_id,            // ID de l'alternant hôte (pour routage futur)
      hote_email,         // Email de l'hôte (pour routage futur)
      annonce_titre,
      annonce_ville,
      date_fin,           // Date de fin du bail (initial)
      success_url,
      cancel_url,
    } = body;

    if (!contrat_id || !type) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants: contrat_id et type requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier que le contrat appartient à l'utilisateur connecté
    const { data: contratCheck } = await supabase
      .from("contrats")
      .select("locataire_id")
      .eq("id", contrat_id)
      .single();

    if (!contratCheck || contratCheck.locataire_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Accès non autorisé à ce contrat" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type !== "impaye" && type !== "initial") {
      return new Response(
        JSON.stringify({ error: "Type invalide. Utilisez 'impaye' ou 'initial'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const logementLabel = `${annonce_titre || "votre logement"}${annonce_ville ? ` à ${annonce_ville}` : ""}`;
    const baseUrl = "https://sterny.co";

    // ================================================================
    // TYPE INITIAL : Prélèvement SEPA automatique (abonnement)
    // ================================================================
    if (type === "initial") {
      if (!loyer_mensuel || !commission_mensuelle) {
        return new Response(
          JSON.stringify({ error: "loyer_mensuel et commission_mensuelle requis pour type initial" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 1. Créer ou récupérer le Stripe Customer
      let customerId: string;

      // Vérifier si un customer existe déjà pour ce contrat
      const { data: contratData } = await supabase
        .from("contrats")
        .select("stripe_customer_id")
        .eq("id", contrat_id)
        .single();

      if (contratData?.stripe_customer_id) {
        customerId = contratData.stripe_customer_id;
        console.log(`Customer existant: ${customerId}`);
      } else {
        // Créer un nouveau Customer
        const customer = await stripe.customers.create({
          email: locataire_email || undefined,
          name: [locataire_prenom, locataire_nom].filter(Boolean).join(" ") || undefined,
          metadata: {
            contrat_id,
            locataire_id: locataire_id || "",
            plateforme: "STERNY",
          },
        });
        customerId = customer.id;
        console.log(`Nouveau customer créé: ${customerId}`);

        // Sauvegarder dans le contrat
        await supabase
          .from("contrats")
          .update({ stripe_customer_id: customerId })
          .eq("id", contrat_id);
      }

      // 2. Ajouter le dépôt de garantie comme invoice item (facturé sur la 1ère facture)
      if (depot && depot > 0) {
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: Math.round(depot * 100),
          currency: "eur",
          description: `Dépôt de garantie (2 mois) — ${logementLabel}`,
        });
        console.log(`Invoice item dépôt ajouté: ${depot}€`);
      }

      // 3. Calculer la date de fin pour cancel_at
      const subscriptionData: any = {
        metadata: {
          contrat_id,
          type: "loyer_mensuel",
        },
      };

      if (date_fin) {
        const finTimestamp = Math.floor(new Date(date_fin).getTime() / 1000);
        subscriptionData.cancel_at = finTimestamp;
        console.log(`Abonnement se terminera le: ${date_fin}`);
      }

      // 4. Créer la session Checkout en mode subscription avec SEPA
      const totalMensuel = Math.round((loyer_mensuel + commission_mensuelle) * 100);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["sepa_debit"],
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "eur",
              recurring: { interval: "month" },
              product_data: {
                name: `Loyer mensuel — ${logementLabel}`,
                description: `Loyer ${loyer_mensuel}€ + Commission STERNY ${commission_mensuelle}€`,
              },
              unit_amount: totalMensuel,
            },
            quantity: 1,
          },
        ],
        subscription_data: subscriptionData,
        success_url: success_url || `${baseUrl}/paiement-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${baseUrl}/dashboard-locataire.html`,
        metadata: {
          contrat_id,
          type: "initial",
          locataire_nom: locataire_nom || "",
          locataire_prenom: locataire_prenom || "",
          locataire_id: locataire_id || "",
          hote_id: hote_id || "",
          hote_email: hote_email || "",
          annonce_titre: annonce_titre || "",
          annonce_ville: annonce_ville || "",
        },
        locale: "fr",
      });

      console.log(`Session SEPA créée: ${session.id} — loyer:${loyer_mensuel}€/mois + commission:${commission_mensuelle}€/mois + dépôt:${depot || 0}€`);

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // TYPE IMPAYE : Paiement ponctuel par carte
    // ================================================================
    if (type === "impaye") {
      if (!montant) {
        return new Response(
          JSON.stringify({ error: "montant requis pour type impaye" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stripeLineItems: any[] = [];
      const moisDate = new Date(mois + "T00:00:00");
      const moisFormate = moisDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

      if (loyer && loyer > 0) {
        stripeLineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: `Loyer — ${moisFormate}`,
              description: `Paiement du loyer pour ${logementLabel}`,
            },
            unit_amount: Math.round(loyer * 100),
          },
          quantity: 1,
        });
      }

      if (commission && commission > 0) {
        stripeLineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: "Commission STERNY (10%)",
              description: "Commission plateforme",
            },
            unit_amount: Math.round(commission * 100),
          },
          quantity: 1,
        });
      }

      // Fallback
      if (stripeLineItems.length === 0) {
        stripeLineItems.push({
          price_data: {
            currency: "eur",
            product_data: { name: `Loyer — ${moisFormate}` },
            unit_amount: Math.round(montant * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: stripeLineItems,
        mode: "payment",
        success_url: success_url || `${baseUrl}/paiement-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${baseUrl}/dashboard-locataire.html`,
        metadata: {
          contrat_id,
          mois: mois || "",
          paiement_id: paiement_id || "",
          type: "impaye",
          locataire_nom: locataire_nom || "",
          locataire_prenom: locataire_prenom || "",
        },
        locale: "fr",
      });

      console.log(`Session impayé créée: ${session.id} — ${montant}€`);

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Erreur création checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
