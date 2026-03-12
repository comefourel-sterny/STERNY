// Supabase Edge Function : check-baux-expirants
// Fonction CRON quotidienne — vérifie les baux qui expirent bientôt
// et déclenche l'envoi des emails de rappel via send-fin-bail-email
//
// À déployer dans : Dashboard > Edge Functions > Create > "check-baux-expirants"
// Secrets requis : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (automatiques dans Supabase)
//
// Déclenchement : cron quotidien à 8h UTC (voir script-notifications.sql)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ================================================================
// UTILITAIRES
// ================================================================

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function diffDays(dateStr: string, today: string): number {
  const d1 = new Date(dateStr);
  const d2 = new Date(today);
  return Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

// ================================================================
// HANDLER PRINCIPAL
// ================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Créer un client Supabase avec le service role (accès total)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];
    const date45j = addDays(today, 45);
    const date15j = addDays(today, 15);

    console.log(`🔍 Check baux expirants — Aujourd'hui: ${today}`);
    console.log(`   → Recherche baux finissant le ${date45j} (45j) et ${date15j} (15j)`);

    const results: {
      contrat_id: string;
      type: string;
      emails_sent: number;
      success: boolean;
    }[] = [];

    // ================================================================
    // TRAITER LES RAPPELS 45 JOURS
    // ================================================================
    await traiterRappels(supabase, date45j, "rappel_45j", 45, today, results);

    // ================================================================
    // TRAITER LES RAPPELS 15 JOURS
    // ================================================================
    await traiterRappels(supabase, date15j, "rappel_15j", 15, today, results);

    console.log(`\n✅ Traitement terminé — ${results.length} contrats traités`);

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        contrats_traites: results.length,
        details: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erreur globale:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ================================================================
// TRAITER LES RAPPELS POUR UNE DATE DONNÉE
// ================================================================

async function traiterRappels(
  supabase: any,
  dateCible: string,
  typeRappel: string,
  joursRestants: number,
  today: string,
  results: any[]
) {
  // 1. Trouver les contrats signés qui finissent à cette date
  const { data: contrats, error: contratsError } = await supabase
    .from("contrats")
    .select("*")
    .eq("statut", "signe")
    .eq("date_fin", dateCible);

  if (contratsError) {
    console.error(`❌ Erreur requête contrats (${typeRappel}):`, contratsError);
    return;
  }

  if (!contrats || contrats.length === 0) {
    console.log(`   → Aucun contrat finissant le ${dateCible}`);
    return;
  }

  console.log(`   → ${contrats.length} contrat(s) finissant le ${dateCible}`);

  for (const contrat of contrats) {
    // 2. Vérifier si le rappel a déjà été envoyé
    const { data: dejaEnvoye } = await supabase
      .from("notifications_envoyees")
      .select("id")
      .eq("contrat_id", contrat.id)
      .eq("type", typeRappel)
      .maybeSingle();

    if (dejaEnvoye) {
      console.log(`   ⏭ Contrat ${contrat.id} — rappel ${typeRappel} déjà envoyé`);
      continue;
    }

    // 3. Charger les données liées
    const { data: annonce } = await supabase
      .from("annonces")
      .select("titre, ville")
      .eq("id", contrat.annonce_id)
      .single();

    const { data: locataire } = await supabase
      .from("users")
      .select("prenom, nom, email")
      .eq("id", contrat.locataire_id)
      .single();

    const { data: proprietaire } = await supabase
      .from("users")
      .select("prenom, nom, email")
      .eq("id", contrat.proprietaire_id)
      .single();

    if (!locataire || !proprietaire || !annonce) {
      console.error(`   ❌ Données manquantes pour contrat ${contrat.id}`);
      continue;
    }

    // 4. Vérifier s'il y a un renouvellement en cours
    const { data: renouvellement } = await supabase
      .from("renouvellements")
      .select("statut")
      .eq("contrat_original_id", contrat.id)
      .in("statut", ["demande_locataire", "acceptee", "contrat_genere"])
      .maybeSingle();

    const renouvellementEnCours = !!renouvellement;

    // 5. Vérifier si c'est un logement en alternance (2 contrats actifs sur la même annonce)
    const { data: autresContrats } = await supabase
      .from("contrats")
      .select("*, locataire:users!contrats_locataire_id_fkey(prenom, nom, email)")
      .eq("annonce_id", contrat.annonce_id)
      .eq("statut", "signe")
      .neq("id", contrat.id);

    const estAlternance = autresContrats && autresContrats.length > 0;
    const coAlternant = estAlternance ? autresContrats[0]?.locataire : null;

    console.log(
      `   📧 Contrat ${contrat.id} — ${locataire.prenom} ${locataire.nom}` +
        ` — ${annonce.titre} (${annonce.ville})` +
        ` — renouvellement: ${renouvellementEnCours ? "OUI" : "NON"}` +
        ` — alternance: ${estAlternance ? "OUI" : "NON"}`
    );

    // 6. Appeler send-fin-bail-email
    try {
      const emailPayload: Record<string, any> = {
        type: typeRappel,
        locataire_email: locataire.email,
        locataire_prenom: locataire.prenom,
        proprietaire_email: proprietaire.email,
        proprietaire_prenom: proprietaire.prenom,
        contrat_id: contrat.id,
        annonce_titre: annonce.titre,
        annonce_ville: annonce.ville,
        date_fin: contrat.date_fin,
        loyer: contrat.loyer_mensuel,
        jours_restants: joursRestants,
        renouvellement_en_cours: renouvellementEnCours,
        est_alternance: estAlternance,
      };

      if (estAlternance && coAlternant) {
        emailPayload.co_alternant_prenom = coAlternant.prenom;
        emailPayload.co_alternant_email = coAlternant.email;
      }

      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        "send-fin-bail-email",
        { body: emailPayload }
      );

      if (emailError) {
        console.error(`   ❌ Erreur envoi emails pour contrat ${contrat.id}:`, emailError);
        results.push({ contrat_id: contrat.id, type: typeRappel, emails_sent: 0, success: false });
        continue;
      }

      // 7. Marquer comme envoyé
      const { error: insertError } = await supabase.from("notifications_envoyees").insert({
        contrat_id: contrat.id,
        type: typeRappel,
        locataire_email: locataire.email,
        proprietaire_email: proprietaire.email,
      });

      if (insertError) {
        console.error(`   ⚠️ Erreur marquage envoyé pour contrat ${contrat.id}:`, insertError);
      }

      const emailsSent = emailResult?.results?.length || 2;
      results.push({ contrat_id: contrat.id, type: typeRappel, emails_sent: emailsSent, success: true });
      console.log(`   ✅ ${emailsSent} email(s) envoyé(s) pour contrat ${contrat.id}`);
    } catch (err) {
      console.error(`   ❌ Exception pour contrat ${contrat.id}:`, err);
      results.push({ contrat_id: contrat.id, type: typeRappel, emails_sent: 0, success: false });
    }
  }
}
