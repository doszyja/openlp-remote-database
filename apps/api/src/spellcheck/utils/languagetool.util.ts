/** Domyślny URL w sieci Docker Compose (serwis `languagetool`). */
export const DEFAULT_LT_SELF_HOSTED_URL = 'http://languagetool:8081/v2/check';

export function resolveLanguageToolApiUrl(): string {
  const configured = process.env.LANGUAGETOOL_API_URL?.trim();
  const url = configured || DEFAULT_LT_SELF_HOSTED_URL;
  if (url.includes('api.languagetool.org') || url.includes('languagetoolplus.com')) {
    throw new Error(
      'Publiczne API LanguageTool jest wyłączone. Ustaw LANGUAGETOOL_API_URL na własny kontener (np. http://languagetool:8081/v2/check).',
    );
  }
  return url;
}

export function defaultSpellcheckDelayMs(): number {
  if (process.env.SPELLCHECK_LT_DELAY_MS !== undefined) {
    return Number(process.env.SPELLCHECK_LT_DELAY_MS);
  }
  return 0;
}

const SPELLING_ISSUE_TYPES = new Set(['misspelling', 'typographical']);

export interface LtMatch {
  offset: number;
  length: number;
  message: string;
  replacements: Array<{ value: string }>;
  rule: { id: string; issueType?: string };
}

export function resolveLanguageToolCode(language?: string): string {
  const code = (language || 'pl').toLowerCase().split('-')[0];
  switch (code) {
    case 'pl':
      return 'pl-PL';
    case 'en':
      return 'en-US';
    case 'de':
      return 'de-DE';
    case 'es':
      return 'es';
    case 'fr':
      return 'fr';
    default:
      return 'pl-PL';
  }
}

export function isSpellingMatch(match: LtMatch): boolean {
  const issueType = match.rule.issueType;
  if (issueType && SPELLING_ISSUE_TYPES.has(issueType)) {
    return true;
  }
  return match.rule.id.toUpperCase().includes('SPELL');
}

export async function checkTextWithLanguageTool(
  text: string,
  language: string,
  apiUrl = resolveLanguageToolApiUrl(),
): Promise<LtMatch[]> {
  if (text.length < 3) {
    return [];
  }

  const body = new URLSearchParams({
    text,
    language,
    enabledOnly: 'false',
  });

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `LanguageTool HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
    );
  }

  const data = (await response.json()) as { matches?: LtMatch[] };
  return (data.matches ?? []).filter(isSpellingMatch);
}