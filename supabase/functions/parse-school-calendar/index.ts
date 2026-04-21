// Supabase Edge Function : parse-school-calendar
// Parse un document école (image ou PDF) via Claude vision pour extraire
// le calendrier d'alternance (groupes + semaines école/entreprise).
// Insère le résultat dans rhythm_imports et renvoie les groupes détectés.
// Secrets requis : ANTHROPIC_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AnthropicProvider } from "./providers/anthropic.ts";
import { LLMParseError } from "./providers/types.ts";
import { uploadToRhythmBucket } from "./lib/storage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // === 1. Vérification authentification ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "auth_required", message: "Non authentifié" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Client avec JWT user pour vérifier l'identité
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "auth_invalid", message: "Token invalide" }, 401);
    }

    // Client service_role pour contourner RLS (insert rhythm_imports + upload storage)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // === 2. Parser le formData ===
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return jsonResponse(
        { error: "invalid_body", message: "Le body doit être multipart/form-data avec un champ 'file'" },
        400
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return jsonResponse(
        { error: "missing_file", message: "Le champ 'file' est requis" },
        400
      );
    }

    // === 3. Validation du fichier ===
    const mimeType = file.type;
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return jsonResponse(
        {
          error: "invalid_file_type",
          message: `Type de fichier non supporté: ${mimeType}. Formats acceptés: JPEG, PNG, HEIC, WebP.`,
        },
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        {
          error: "file_too_large",
          message: `Le fichier dépasse la limite de 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
        },
        400
      );
    }

    // === 4. Préparer l'upload ===
    const rhythmImportId = crypto.randomUUID();
    const ext = MIME_TO_EXT[mimeType] || "bin";
    const storagePath = `${user.id}/${rhythmImportId}.${ext}`;

    console.log(
      `[parse-school-calendar] user=${user.id} file=${file.name} type=${mimeType} size=${file.size} import_id=${rhythmImportId}`
    );

    // === 5. Upload dans le bucket ===
    await uploadToRhythmBucket(supabaseService, storagePath, file);

    // === 6. Convertir en base64 pour le LLM ===
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    const fileBase64 = btoa(binary);

    // === 7. Appeler le provider LLM ===
    const provider = new AnthropicProvider();

    try {
      const { raw, parsed } = await provider.parseSchoolCalendar(
        fileBase64,
        mimeType
      );

      // === 8. Succès : insert dans rhythm_imports ===
      const { error: insertError } = await supabaseService
        .from("rhythm_imports")
        .insert({
          id: rhythmImportId,
          user_id: user.id,
          source_file_path: storagePath,
          source_file_type: mimeType,
          source_file_size_bytes: file.size,
          parser_version: "v1",
          llm_provider: provider.name,
          llm_model: provider.model,
          raw_response: raw,
          parsed_groups: parsed,
          status: "parsed",
        });

      if (insertError) {
        console.error("[parse-school-calendar] Insert error:", insertError);
        throw new Error(`Erreur insertion rhythm_imports: ${insertError.message}`);
      }

      console.log(
        `[parse-school-calendar] Succès: ${parsed.groups.length} groupes détectés`
      );

      // === 9. Réponse au frontend (sans le détail des semaines) ===
      return jsonResponse(
        {
          rhythm_import_id: rhythmImportId,
          document_meta: parsed.document_meta,
          groups: parsed.groups.map((g) => ({
            group_id: g.group_id,
            group_label: g.group_label,
            weeks_count: g.weeks.length,
            school_weeks_count: g.weeks.filter((w) => w.status === "school")
              .length,
            company_weeks_count: g.weeks.filter(
              (w) => w.status === "company"
            ).length,
          })),
        },
        200
      );
    } catch (err) {
      // === 10. Échec parsing LLM ===
      if (err instanceof LLMParseError) {
        console.error(
          `[parse-school-calendar] LLMParseError code=${err.code}: ${err.message}`
        );

        // Insert en status failed
        const { error: insertError } = await supabaseService
          .from("rhythm_imports")
          .insert({
            id: rhythmImportId,
            user_id: user.id,
            source_file_path: storagePath,
            source_file_type: mimeType,
            source_file_size_bytes: file.size,
            parser_version: "v1",
            llm_provider: provider.name,
            llm_model: provider.model,
            raw_response: err.raw ?? null,
            parsed_groups: null,
            status: "failed",
            error_message: err.message,
          });

        if (insertError) {
          console.error(
            "[parse-school-calendar] Insert failed record error:",
            insertError
          );
        }

        return jsonResponse(
          {
            error: err.code,
            message: err.message,
            rhythm_import_id: rhythmImportId,
          },
          422
        );
      }

      // Erreur inattendue (pas un LLMParseError)
      throw err;
    }
  } catch (error) {
    console.error("[parse-school-calendar] Unhandled error:", error);
    return jsonResponse(
      { error: "internal_error", message: (error as Error).message },
      500
    );
  }
});
