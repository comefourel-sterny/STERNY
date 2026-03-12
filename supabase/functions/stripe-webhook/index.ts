// Supabase Edge Function : stripe-webhook
// Reçoit les événements Stripe (paiement réussi, échoué, etc.)
// et met à jour la base de données en conséquence.
// Gère : checkout.session.completed, invoice.paid, invoice.payment_failed,
//        customer.subscription.deleted, checkout.session.expired,
//        identity.verification_session.verified, identity.verification_session.requires_input
// Secrets requis : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lire le body brut pour la vérification de signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Pas de signature Stripe");
      return new Response(
        JSON.stringify({ error: "Signature manquante" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier la signature du webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Vérification signature échouée:", err.message);
      return new Response(
        JSON.stringify({ error: "Signature invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Webhook reçu: ${event.type} — ${event.id}`);

    // ================================================================
    // TRAITER LES ÉVÉNEMENTS
    // ================================================================

    switch (event.type) {
      // ---------------------------------------------------------------
      // CHECKOUT SESSION COMPLETED (initial setup)
      // ---------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        console.log(`Checkout terminé: ${session.id}`);
        console.log(`Type: ${metadata.type}, Contrat: ${metadata.contrat_id}`);
        console.log(`Mode: ${session.mode}, Montant: ${(session.amount_total || 0) / 100}€`);

        if (metadata.type === "initial" && metadata.contrat_id) {
          // ──────────────────────────────────────────────
          // PAIEMENT INITIAL (abonnement SEPA)
          // ──────────────────────────────────────────────
          console.log(`Prélèvement SEPA mis en place pour contrat ${metadata.contrat_id}`);

          const updateData: any = {
            paiement_initial_ok: true,
            paiement_initial_date: new Date().toISOString(),
            stripe_session_id: session.id,
            sepa_mandate_active: true,
          };

          // Stocker le hote_id si présent (modèle sous-location)
          if (metadata.hote_id) {
            updateData.hote_id = metadata.hote_id;
          }

          // Stocker le subscription ID
          if (session.subscription) {
            updateData.stripe_subscription_id = session.subscription as string;
            console.log(`Subscription ID: ${session.subscription}`);
          }

          // Stocker le customer ID
          if (session.customer) {
            updateData.stripe_customer_id = session.customer as string;
          }

          // Récupérer le payment method ID depuis la subscription
          if (session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              if (subscription.default_payment_method) {
                updateData.stripe_payment_method_id = subscription.default_payment_method as string;
              }
            } catch (e) {
              console.error("Erreur récupération subscription:", e.message);
            }
          }

          const { error: updateError } = await supabase
            .from("contrats")
            .update(updateData)
            .eq("id", metadata.contrat_id);

          if (updateError) {
            console.error("Erreur mise à jour contrat:", updateError);
          } else {
            console.log(`Contrat ${metadata.contrat_id} mis à jour — SEPA actif`);
          }

        } else if (metadata.type === "impaye" && metadata.contrat_id && metadata.mois) {
          // ──────────────────────────────────────────────
          // PAIEMENT IMPAYÉ (ponctuel par carte)
          // ──────────────────────────────────────────────
          const { error: updateError } = await supabase
            .from("paiements_loyer")
            .update({
              statut: "paye",
              date_paiement: new Date().toISOString(),
              stripe_session_id: session.id,
              stripe_payment_intent: session.payment_intent as string,
              updated_at: new Date().toISOString(),
            })
            .eq("contrat_id", metadata.contrat_id)
            .eq("mois", metadata.mois);

          if (updateError) {
            console.error("Erreur mise à jour paiement:", updateError);
          } else {
            console.log(`Paiement impayé mis à jour: contrat ${metadata.contrat_id} mois ${metadata.mois} → payé`);
          }

          // Charger les infos pour log
          const { data: contrat } = await supabase
            .from("contrats")
            .select("locataire_id, proprietaire_id, annonce_id")
            .eq("id", metadata.contrat_id)
            .single();

          if (contrat) {
            const { data: locataire } = await supabase
              .from("users")
              .select("prenom, nom, email")
              .eq("id", contrat.locataire_id)
              .single();

            if (locataire) {
              const montantEuros = (session.amount_total || 0) / 100;
              const moisDate = new Date(metadata.mois + "T00:00:00");
              const moisFormate = moisDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
              console.log(`✅ Paiement confirmé: ${locataire.prenom} ${locataire.nom} a payé ${montantEuros}€ pour ${moisFormate}`);

              // Envoyer le reçu de paiement par email
              try {
                const { data: annonce } = await supabase
                  .from("annonces")
                  .select("titre, ville, adresse")
                  .eq("id", contrat.annonce_id)
                  .single();

                const { data: proprietaire } = await supabase
                  .from("users")
                  .select("prenom, nom")
                  .eq("id", contrat.proprietaire_id)
                  .single();

                await supabase.functions.invoke("send-recu-paiement", {
                  body: {
                    locataire_email: locataire.email,
                    locataire_prenom: locataire.prenom,
                    locataire_nom: locataire.nom,
                    annonce_titre: annonce?.titre || "Votre logement",
                    annonce_ville: annonce?.ville || "",
                    annonce_adresse: annonce?.adresse || "",
                    mois: metadata.mois,
                    montant: montantEuros,
                    type: "impaye",
                    reference: session.id,
                    date_paiement: new Date().toISOString(),
                    proprietaire_nom: proprietaire ? `${proprietaire.prenom} ${proprietaire.nom}` : undefined,
                  },
                });
                console.log(`📧 Reçu de paiement envoyé à ${locataire.email}`);
              } catch (emailErr) {
                console.error("Erreur envoi reçu:", emailErr);
              }
            }
          }
        }

        break;
      }

      // ---------------------------------------------------------------
      // FACTURE PAYÉE (prélèvement mensuel automatique)
      // ---------------------------------------------------------------
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        console.log(`Facture payée: ${invoice.id} — ${(invoice.amount_paid || 0) / 100}€`);

        if (!subscriptionId) {
          console.log("Facture sans subscription, ignorée");
          break;
        }

        // Récupérer le contrat lié à cette subscription
        const { data: contrat, error: contratError } = await supabase
          .from("contrats")
          .select("id, locataire_id, proprietaire_id, annonce_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (contratError || !contrat) {
          console.error("Contrat non trouvé pour subscription:", subscriptionId);
          break;
        }

        // Déterminer le mois de ce paiement
        const periodStart = new Date((invoice.period_start || 0) * 1000);
        const mois = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}-01`;

        // Calculer les montants (le montant total inclut loyer + commission)
        const montantTotal = (invoice.amount_paid || 0) / 100;

        // Vérifier si c'est la première facture (contient le dépôt)
        // La première facture a des invoice items additionnels (dépôt)
        const invoiceLines = invoice.lines?.data || [];
        const hasRecurring = invoiceLines.some((line: any) => line.type === "subscription");
        const hasOneTime = invoiceLines.some((line: any) => line.type === "invoiceitem");

        if (hasOneTime && hasRecurring) {
          // Première facture : dépôt + premier mois
          console.log(`Première facture (dépôt + 1er mois) pour contrat ${contrat.id}`);

          // Calculer le montant récurrent (sans le dépôt)
          const recurringLine = invoiceLines.find((line: any) => line.type === "subscription");
          const montantRecurrent = recurringLine ? (recurringLine.amount || 0) / 100 : montantTotal;
          const montantDepot = montantTotal - montantRecurrent;

          // Enregistrer le loyer du 1er mois
          const { error: insertError } = await supabase
            .from("paiements_loyer")
            .upsert({
              contrat_id: contrat.id,
              mois: mois,
              montant: montantRecurrent,
              statut: "paye",
              date_paiement: new Date().toISOString(),
              stripe_invoice_id: invoice.id,
              stripe_payment_intent_id: invoice.payment_intent as string,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "contrat_id,mois",
            });

          if (insertError) {
            console.error("Erreur création paiement 1er mois:", insertError);
          } else {
            console.log(`✅ Premier loyer enregistré: ${montantRecurrent}€ (+ dépôt ${montantDepot}€) — ${mois}`);

            // Envoyer le reçu de paiement par email (1er mois)
            try {
              const { data: locataire } = await supabase
                .from("users")
                .select("prenom, nom, email")
                .eq("id", contrat.locataire_id)
                .single();

              const { data: proprietaire } = await supabase
                .from("users")
                .select("prenom, nom")
                .eq("id", contrat.proprietaire_id)
                .single();

              const { data: annonce } = await supabase
                .from("annonces")
                .select("titre, ville, adresse")
                .eq("id", contrat.annonce_id)
                .single();

              if (locataire?.email) {
                await supabase.functions.invoke("send-recu-paiement", {
                  body: {
                    locataire_email: locataire.email,
                    locataire_prenom: locataire.prenom,
                    locataire_nom: locataire.nom,
                    annonce_titre: annonce?.titre || "Votre logement",
                    annonce_ville: annonce?.ville || "",
                    annonce_adresse: annonce?.adresse || "",
                    mois,
                    montant: montantRecurrent,
                    type: "initial",
                    reference: invoice.id,
                    date_paiement: new Date().toISOString(),
                    proprietaire_nom: proprietaire ? `${proprietaire.prenom} ${proprietaire.nom}` : undefined,
                  },
                });
                console.log(`📧 Reçu premier paiement envoyé à ${locataire.email}`);
              }
            } catch (emailErr) {
              console.error("Erreur envoi reçu premier mois:", emailErr);
            }
          }

        } else if (hasRecurring) {
          // Facture mensuelle récurrente
          console.log(`Facture mensuelle récurrente pour contrat ${contrat.id} — ${mois}`);

          const { error: insertError } = await supabase
            .from("paiements_loyer")
            .upsert({
              contrat_id: contrat.id,
              mois: mois,
              montant: montantTotal,
              statut: "paye",
              date_paiement: new Date().toISOString(),
              stripe_invoice_id: invoice.id,
              stripe_payment_intent_id: invoice.payment_intent as string,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "contrat_id,mois",
            });

          if (insertError) {
            console.error("Erreur création paiement mensuel:", insertError);
          } else {
            console.log(`✅ Loyer mensuel enregistré: ${montantTotal}€ — ${mois}`);

            // Envoyer le reçu de paiement par email (mensuel récurrent)
            try {
              const { data: locataire } = await supabase
                .from("users")
                .select("prenom, nom, email")
                .eq("id", contrat.locataire_id)
                .single();

              const { data: proprietaire } = await supabase
                .from("users")
                .select("prenom, nom")
                .eq("id", contrat.proprietaire_id)
                .single();

              const { data: annonce } = await supabase
                .from("annonces")
                .select("titre, ville, adresse")
                .eq("id", contrat.annonce_id)
                .single();

              if (locataire?.email) {
                await supabase.functions.invoke("send-recu-paiement", {
                  body: {
                    locataire_email: locataire.email,
                    locataire_prenom: locataire.prenom,
                    locataire_nom: locataire.nom,
                    annonce_titre: annonce?.titre || "Votre logement",
                    annonce_ville: annonce?.ville || "",
                    annonce_adresse: annonce?.adresse || "",
                    mois,
                    montant: montantTotal,
                    type: "mensuel",
                    reference: invoice.id,
                    date_paiement: new Date().toISOString(),
                    proprietaire_nom: proprietaire ? `${proprietaire.prenom} ${proprietaire.nom}` : undefined,
                  },
                });
                console.log(`📧 Reçu mensuel envoyé à ${locataire.email}`);
              }
            } catch (emailErr) {
              console.error("Erreur envoi reçu mensuel:", emailErr);
            }
          }
        }

        break;
      }

      // ---------------------------------------------------------------
      // ÉCHEC DE PAIEMENT (prélèvement SEPA échoué)
      // ---------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        console.log(`⚠️ Échec paiement facture: ${invoice.id} — ${(invoice.amount_due || 0) / 100}€`);

        if (!subscriptionId) {
          console.log("Facture sans subscription, ignorée");
          break;
        }

        // Récupérer le contrat
        const { data: contrat } = await supabase
          .from("contrats")
          .select("id, locataire_id, proprietaire_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (!contrat) {
          console.error("Contrat non trouvé pour subscription:", subscriptionId);
          break;
        }

        // Déterminer le mois
        const periodStart = new Date((invoice.period_start || 0) * 1000);
        const mois = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}-01`;
        const montant = (invoice.amount_due || 0) / 100;

        // Créer ou mettre à jour le paiement comme impayé
        const { error: upsertError } = await supabase
          .from("paiements_loyer")
          .upsert({
            contrat_id: contrat.id,
            mois: mois,
            montant: montant,
            statut: "impaye",
            stripe_invoice_id: invoice.id,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "contrat_id,mois",
          });

        if (upsertError) {
          console.error("Erreur upsert paiement impayé:", upsertError);
        } else {
          console.log(`❌ Paiement marqué impayé: contrat ${contrat.id} — ${mois} — ${montant}€`);
        }

        // Log pour notification future
        const { data: locataire } = await supabase
          .from("users")
          .select("prenom, nom, email")
          .eq("id", contrat.locataire_id)
          .single();

        if (locataire) {
          console.log(`📧 Notification à envoyer: ${locataire.email} — échec prélèvement ${montant}€ pour ${mois}`);
        }

        break;
      }

      // ---------------------------------------------------------------
      // ABONNEMENT ANNULÉ (fin de bail ou annulation)
      // ---------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        console.log(`Abonnement annulé: ${subscriptionId}`);

        // Récupérer le contrat
        const { data: contrat } = await supabase
          .from("contrats")
          .select("id, locataire_id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (!contrat) {
          console.error("Contrat non trouvé pour subscription:", subscriptionId);
          break;
        }

        // Mettre à jour le contrat
        const { error: updateError } = await supabase
          .from("contrats")
          .update({
            sepa_mandate_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contrat.id);

        if (updateError) {
          console.error("Erreur mise à jour contrat:", updateError);
        } else {
          console.log(`✅ Contrat ${contrat.id} — prélèvement SEPA désactivé (fin de bail)`);
        }

        break;
      }

      // ---------------------------------------------------------------
      // SESSION EXPIRÉE
      // ---------------------------------------------------------------
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Session expirée: ${session.id}`);
        // Rien à faire — le paiement reste en attente
        break;
      }

      // ---------------------------------------------------------------
      // STRIPE IDENTITY — VÉRIFICATION RÉUSSIE
      // ---------------------------------------------------------------
      case "identity.verification_session.verified": {
        const verificationSession = event.data.object as any;
        const userId = verificationSession.metadata?.user_id;

        console.log(`✅ Identity vérifiée: session ${verificationSession.id}, user ${userId}`);

        if (userId) {
          const { error: updateError } = await supabase
            .from("users")
            .update({
              identite_verifiee: "verifiee",
              stripe_identity_session_id: verificationSession.id,
              identite_verifiee_date: new Date().toISOString(),
            })
            .eq("id", userId);

          if (updateError) {
            console.error("Erreur mise à jour identité:", updateError);
          } else {
            console.log(`✅ User ${userId} — identité vérifiée`);
          }
        } else {
          console.error("Identity session sans user_id dans metadata");
        }

        break;
      }

      // ---------------------------------------------------------------
      // STRIPE IDENTITY — VÉRIFICATION NÉCESSITE RÉVISION
      // ---------------------------------------------------------------
      case "identity.verification_session.requires_input": {
        const verificationSession = event.data.object as any;
        const userId = verificationSession.metadata?.user_id;

        console.log(`⚠️ Identity nécessite révision: session ${verificationSession.id}, user ${userId}`);

        if (userId) {
          await supabase
            .from("users")
            .update({
              identite_verifiee: "echec_verification",
            })
            .eq("id", userId);
        }

        break;
      }

      // ---------------------------------------------------------------
      // AUTRES ÉVÉNEMENTS
      // ---------------------------------------------------------------
      default:
        console.log(`Événement non traité: ${event.type}`);
    }

    // Toujours répondre 200 pour confirmer la réception
    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
