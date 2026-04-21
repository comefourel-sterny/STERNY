// Types partagés pour les providers LLM — parse-school-calendar

export interface LLMProvider {
  name: string;
  model: string;
  parseSchoolCalendar(fileBase64: string, mimeType: string): Promise<{
    raw: unknown;
    parsed: ParsedCalendar;
  }>;
}

export interface ParsedCalendar {
  document_meta: {
    school_name: string | null;
    program_name: string | null;
    academic_year: string | null;
    detected_locale: string;
  };
  groups: Array<{
    group_id: string;
    group_label: string;
    weeks: Array<{
      week_start: string;
      status: 'school' | 'company';
    }>;
  }>;
}

export class LLMParseError extends Error {
  code: 'invalid_json' | 'not_a_school_calendar' | 'network' | 'api_error' | 'unknown';
  raw?: unknown;

  constructor(
    message: string,
    code: 'invalid_json' | 'not_a_school_calendar' | 'network' | 'api_error' | 'unknown',
    raw?: unknown
  ) {
    super(message);
    this.code = code;
    this.raw = raw;
  }
}
