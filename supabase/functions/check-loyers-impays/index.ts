// Supabase Edge Function : check-loyers-impays
// Fonction CRON quotidienne — détecte les loyers impayés signalés
// par les propriétaires et déclenche l'envoi des emails de relance
// au locataire, au propriétaire et au garant.
//
// À déployer dans : Dashboard > Edge Functions > Create > "check-loyers-impays"
// Secrets requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automatiques)
//
// Déclenchement : cron quotidien à 9h UTC (après check-baux-expirants à 8h)
// URL : https://rkffpmuhyvwwgfbdqmqr.supabase.co/functions/v1/check-loyers-impays

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ================================================================
// HANDLER PRINCIPAL
// ================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];
    console.log(`\uD83D\uDD0D Check loyers impayés — ${today}`);

    const results: {
      paiement_id: string;
      contrat_id: string;
      mois: string;
      emails_sent: number;
      success: boolean;
    }[] = [];

    // ================================================================
    // 1. Récupérer tous les paiements impayés non encore relancés
    // ================================================================
    const { data: impayes, error: impayesError } = await supabase
      .from("paiements_loyer")
      .select("*")
      .eq("statut", "impaye");

    if (impayesError) {
      console.error("Erreur requête impayés:", impayesError);
      throw new Error("Erreur lecture paiements_loyer");
    }

    if (!impayes || impayes.length === 0) {
      console.log("Aucun impayé à traiter");
      return new Response(
        JSON.stringify({ success: true, date: today, impayes_traites: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${impayes.length} impayé(s) détecté(s)`);

    // ================================================================
    // 2. Traiter chaque impayé
    // ================================================================
    for (const impaye of impayes) {
      // Vérifier si la relance garant a déjà été envoyée pour ce mois
      const { data: dejaEnvoye } = await supabase
        .from("notifications_envoyees")
        .select("id")
        .eq("contrat_id", impaye.contrat_id)
        .eq("type", "relance_impaye_garant")
        .eq("mois", impaye.mois)
        .maybeSingle();

      if (dejaEnvoye) {
        console.log(`Contrat ${impaye.contrat_id} mois ${impaye.mois} — relance déjà envoyée`);
        continue;
      }

      // Charger les données du contrat
      const { data: contrat } = await supabase
        .from("contrats")
        .select("*")
        .eq("id", impaye.contrat_id)
        .single();

      if (!contrat) {
        console.error(`Contrat ${impaye.contrat_id} introuvable`);
        continue;
      }

      // Charger locataire (avec infos garant)
      const { data: locataire } = await supabase
        .from("users")
        .select("prenom, nom, email, garant_prenom, garant_nom, garant_email, garant_telephone")
        .eq("id", contrat.locataire_id)
        .single();

      // Charger propriétaire
      const { data: proprietaire } = await supabase
        .from("users")
        .select("prenom, nom, email")
        .eq("id", contrat.proprietaire_id)
        .single();

      // Charger annonce
      const { data: annonce } = await supabase
        .from("annonces")
        .select("titre, ville")
        .eq("id", contrat.annonce_id)
        .single();

      if (!locataire || !proprietaire || !annonce) {
        console.error(`Données manquantes pour contrat ${impaye.contrat_id}`);
        continue;
      }

      console.log(
        `Relance: ${locataire.prenom} ${locataire.nom}` +
        ` — ${annonce.titre} (${annonce.ville})` +
        ` — ${impaye.mois} — ${impaye.montant}€` +
        ` — Garant: ${locataire.garant_prenom || "N/A"} (${locataire.garant_email || "pas d'email"})`
      );

      // ================================================================
      // 3. Appeler send-relance-impaye-email
      // ================================================================
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          "send-relance-impaye-email",
          {
            body: {
              locataire_email: locataire.email,
              locataire_prenom: locataire.prenom,
              locataire_nom: locataire.nom,
              proprietaire_email: proprietaire.email,
              proprietaire_prenom: proprietaire.prenom,
              garant_email: locataire.garant_email,
              garant_prenom: locataire.garant_prenom,
              garant_nom: locataire.garant_nom,
              garant_telephone: locataire.garant_telephone,
              annonce_titre: annonce.titre,
              annonce_ville: annonce.ville,
              mois: impaye.mois,
              montant: impaye.montant,
              contrat_id: impaye.contrat_id,
            },
          }
        );

        if (emailError) {
          console.error(`Erreur envoi emails pour ${impaye.contrat_id}:`, emailError);
          results.push({
            paiement_id: impaye.id,
            contrat_id: impaye.contrat_id,
            mois: impaye.mois,
            emails_sent: 0,
            success: false,
          });
          continue;
        }

        // ================================================================
        // 4. Marquer les notifications comme envoyées
        // ================================================================
        const notifTypes = [
          "relance_impaye_locataire",
          "relance_impaye_proprietaire",
        ];
        if (locataire.garant_email) {
          notifTypes.push("relance_impaye_garant");
        }

        for (const notifType of notifTypes) {
          await supabase.from("notifications_envoyees").insert({
            contrat_id: impaye.contrat_id,
            type: notifType,
            locataire_email: locataire.email,
            proprietaire_email: proprietaire.email,
            mois: impaye.mois,
          });
        }

        // 5. Mettre à jour le statut du paiement
        await supabase
          .from("paiements_loyer")
          .update({ statut: "relance_envoyee", updated_at: new Date().toISOString() })
          .eq("id", impaye.id);

        const emailsSent = emailResult?.results?.length || (locataire.garant_email ? 3 : 2);
        results.push({
          paiement_id: impaye.id,
          contrat_id: impaye.contrat_id,
          mois: impaye.mois,
          emails_sent: emailsSent,
          success: true,
        });
        console.log(`${emailsSent} email(s) envoyé(s) pour contrat ${impaye.contrat_id}`);

      } catch (err) {
        console.error(`Exception pour ${impaye.contrat_id}:`, err);
        results.push({
          paiement_id: impaye.id,
          contrat_id: impaye.contrat_id,
          mois: impaye.mois,
          emails_sent: 0,
          success: false,
        });
      }
    }

    console.log(`\nTraitement terminé — ${results.length} impayé(s) traité(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        impayes_traites: results.length,
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur globale:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
