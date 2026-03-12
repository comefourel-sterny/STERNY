// Supabase Edge Function : delete-account
// Supprime le compte utilisateur et toutes ses données (RGPD Art. 17)
// À déployer : supabase functions deploy delete-account
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
    // Vérifier l'authentification de l'utilisateur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier la confirmation ("SUPPRIMER" envoyé par le client)
    const body = await req.json().catch(() => ({}));
    if (body.confirmation !== "SUPPRIMER") {
      return new Response(
        JSON.stringify({ error: "Confirmation requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client avec le token utilisateur (pour identifier qui fait la demande)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Récupérer l'utilisateur connecté
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Client admin avec la clé service_role (pour supprimer les données et le compte)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── Vérifier qu'il n'y a pas de location active ──
    const { data: activeBaux } = await supabaseAdmin
      .from("candidatures")
      .select("id")
      .eq("locataire_id", userId)
      .eq("statut", "actif")
      .limit(1);

    if (activeBaux && activeBaux.length > 0) {
      return new Response(
        JSON.stringify({ error: "Impossible de supprimer le compte : tu as un bail actif. Résilie d'abord ton bail depuis la page du match." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier aussi en tant que propriétaire
    const { data: activeAnnonces } = await supabaseAdmin
      .from("candidatures")
      .select("id, annonces!inner(user_id)")
      .eq("annonces.user_id", userId)
      .eq("statut", "actif")
      .limit(1);

    if (activeAnnonces && activeAnnonces.length > 0) {
      return new Response(
        JSON.stringify({ error: "Impossible de supprimer le compte : tu as des locations actives en tant que propriétaire. Résilie d'abord les baux." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Supprimer les données utilisateur dans l'ordre (dépendances) ──
    const errors: string[] = [];

    async function safeDelete(table: string, column: string, id: string) {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, id);
      if (error) {
        console.error(`Erreur suppression ${table}:`, error.message);
        errors.push(`${table}: ${error.message}`);
      }
    }

    // 1. Signatures audit
    await safeDelete("signatures_audit", "user_id", userId);

    // 2. Avis (donnés par l'utilisateur)
    await safeDelete("avis", "evaluateur_id", userId);

    // 3. Messages (envoyés ET reçus)
    await safeDelete("messages", "expediteur_id", userId);
    await safeDelete("messages", "destinataire_id", userId);

    // 4. Renouvellements
    await supabaseAdmin.from("renouvellements").delete().or(`locataire_id.eq.${userId},proprietaire_id.eq.${userId}`);

    // 5. Paiements loyer (pas de locataire_id — passe par contrat_id)
    const { data: userContrats } = await supabaseAdmin.from("contrats").select("id").or(`locataire_id.eq.${userId},proprietaire_id.eq.${userId}`);
    if (userContrats && userContrats.length > 0) {
      const contratIds = userContrats.map((c: any) => c.id);
      for (const cid of contratIds) {
        await supabaseAdmin.from("paiements_loyer").delete().eq("contrat_id", cid);
      }
    }

    // 6. Etats des lieux
    await supabaseAdmin.from("etats_des_lieux").delete().or(`locataire_id.eq.${userId},proprietaire_id.eq.${userId}`);

    // 7. Contrats
    await supabaseAdmin.from("contrats").delete().or(`locataire_id.eq.${userId},proprietaire_id.eq.${userId}`);

    // 8. Restitutions caution
    await supabaseAdmin.from("restitutions_caution").delete().or(`locataire_id.eq.${userId},proprietaire_id.eq.${userId}`);

    // 9. Candidatures (en tant que locataire)
    await safeDelete("candidatures", "locataire_id", userId);

    // 10. Alertes
    await safeDelete("alertes", "user_id", userId);

    // 11. Favoris
    await safeDelete("favoris", "user_id", userId);

    // 12. Documents
    await safeDelete("documents", "user_id", userId);

    // 13. Mises en relation
    await safeDelete("mises_en_relation", "user_id", userId);

    // 14. Annonces (si propriétaire)
    await safeDelete("annonces", "user_id", userId);

    // 15. Supprimer les fichiers Storage (photos et documents)
    try {
      // Bucket "profils" : fichiers nommés {userId}-{timestamp}.ext (pas dans un dossier)
      const { data: profilFiles } = await supabaseAdmin.storage.from("profils").list();
      if (profilFiles && profilFiles.length > 0) {
        const userProfilFiles = profilFiles.filter((f: any) => f.name.startsWith(userId));
        if (userProfilFiles.length > 0) {
          await supabaseAdmin.storage.from("profils").remove(userProfilFiles.map((f: any) => f.name));
        }
      }

      // Bucket "documents" : fichiers nommés {userId}-{docType}-{timestamp}.ext
      const { data: docFiles } = await supabaseAdmin.storage.from("documents").list();
      if (docFiles && docFiles.length > 0) {
        const userDocFiles = docFiles.filter((f: any) => f.name.startsWith(userId));
        if (userDocFiles.length > 0) {
          await supabaseAdmin.storage.from("documents").remove(userDocFiles.map((f: any) => f.name));
        }
      }

      // Bucket "annonces-photos" : fichiers dans {userId}/{annonceId}/
      const { data: annoncesFolders } = await supabaseAdmin.storage.from("annonces-photos").list(userId);
      if (annoncesFolders && annoncesFolders.length > 0) {
        for (const folder of annoncesFolders) {
          const { data: photos } = await supabaseAdmin.storage.from("annonces-photos").list(`${userId}/${folder.name}`);
          if (photos && photos.length > 0) {
            const paths = photos.map((f: any) => `${userId}/${folder.name}/${f.name}`);
            await supabaseAdmin.storage.from("annonces-photos").remove(paths);
          }
        }
      }
    } catch (storageError) {
      console.error("Erreur suppression storage:", storageError);
      // Non bloquant — on continue
    }

    // 16. Supprimer le profil utilisateur (table users)
    await safeDelete("users", "id", userId);

    // 17. Supprimer le compte auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Erreur suppression auth:", deleteError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la suppression du compte auth" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Compte et données supprimés avec succès",
        warnings: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erreur delete-account:", error);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
