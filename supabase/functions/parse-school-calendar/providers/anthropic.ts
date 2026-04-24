// Provider Anthropic (Claude vision) pour parse-school-calendar
// Utilise fetch direct (pas de SDK Node — incompatible Deno)

import { LLMProvider, ParsedCalendar, LLMParseError } from "./types.ts";
import {
  SCHOOL_CALENDAR_SYSTEM_PROMPT,
  SCHOOL_CALENDAR_USER_PROMPT,
} from "../prompts/school-calendar-v1.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function extractJSON(text: string): string {
  let cleaned = text.trim();

  // Strip markdown code fences ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Skip any preamble before the first {
  if (!cleaned.startsWith("{")) {
    const firstBrace = cleaned.indexOf("{");
    if (firstBrace === -1) {
      throw new Error("Aucun objet JSON trouvé dans la réponse");
    }
    cleaned = cleaned.substring(firstBrace);
  }

  // Trim any trailing text after the matching closing brace
  let depth = 0;
  let inString = false;
  let escape = false;
  let endIndex = -1;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escape) { escape = false; continue; }
    if (char === "\\") { escape = true; continue; }
    if (char === '"' && !escape) inString = !inString;
    if (inString) continue;
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) { endIndex = i; break; }
    }
  }
  if (endIndex !== -1) {
    cleaned = cleaned.substring(0, endIndex + 1);
  }

  return cleaned;
}

function validateParsedCalendar(data: unknown): data is ParsedCalendar {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  // Vérifier document_meta
  if (!obj.document_meta || typeof obj.document_meta !== "object") return false;
  const meta = obj.document_meta as Record<string, unknown>;
  if (typeof meta.detected_locale !== "string") return false;

  // Vérifier groups
  if (!Array.isArray(obj.groups) || obj.groups.length === 0) return false;

  for (const group of obj.groups) {
    if (typeof group !== "object" || !group) return false;
    const g = group as Record<string, unknown>;
    if (typeof g.group_id !== "string") return false;
    if (typeof g.group_label !== "string") return false;
    if (!Array.isArray(g.weeks)) return false;

    for (const week of g.weeks) {
      if (typeof week !== "object" || !week) return false;
      const w = week as Record<string, unknown>;
      if (typeof w.week_start !== "string") return false;
      // Valider format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(w.week_start as string)) return false;
      if (w.status !== "school" && w.status !== "company") return false;
    }
  }

  return true;
}

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  model = MODEL;

  async parseSchoolCalendar(
    fileBase64: string,
    mimeType: string
  ): Promise<{ raw: unknown; parsed: ParsedCalendar }> {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new LLMParseError(
        "ANTHROPIC_API_KEY non configurée",
        "api_error"
      );
    }

    const body = {
      model: MODEL,
      max_tokens: 8000,
      system: SCHOOL_CALENDAR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            mimeType === "application/pdf"
              ? {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: fileBase64,
                  },
                }
              : {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: fileBase64,
                  },
                },
            { type: "text", text: SCHOOL_CALENDAR_USER_PROMPT },
          ],
        },
      ],
    };

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new LLMParseError(
        `Erreur réseau Anthropic: ${err}`,
        "network"
      );
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new LLMParseError(
        `Anthropic API ${response.status}: ${errBody.substring(0, 500)}`,
        "api_error",
        errBody
      );
    }

    const raw = await response.json();
    const textContent = raw?.content?.[0]?.text;

    if (!textContent || typeof textContent !== "string") {
      throw new LLMParseError(
        "Réponse Anthropic vide ou format inattendu",
        "invalid_json",
        raw
      );
    }

    // Parser le JSON (extraction robuste : gère préambule texte et fences markdown)
    let parsed: unknown;
    try {
      const cleaned = extractJSON(textContent);
      parsed = JSON.parse(cleaned);
    } catch {
      throw new LLMParseError(
        "La réponse du LLM n'est pas du JSON valide",
        "invalid_json",
        textContent
      );
    }

    // Vérifier si le LLM a renvoyé une erreur structurée
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as Record<string, unknown>).error === "not_a_school_calendar"
    ) {
      throw new LLMParseError(
        "Le document fourni n'est pas un calendrier scolaire d'alternance",
        "not_a_school_calendar",
        raw
      );
    }

    // Valider la structure
    if (!validateParsedCalendar(parsed)) {
      throw new LLMParseError(
        "La structure JSON renvoyée par le LLM ne correspond pas au schéma attendu",
        "invalid_json",
        raw
      );
    }

    return { raw, parsed };
  }
}
