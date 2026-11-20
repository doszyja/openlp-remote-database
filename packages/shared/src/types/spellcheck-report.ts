/** Single spelling / typo hint in song lyrics (from LanguageTool). */
export interface SpellcheckIssue {
  songId: string;
  songTitle: string;
  songNumber?: string;
  songbook?: string;
  verseOrder: number;
  verseLabel?: string;
  offsetInVerse: number;
  length: number;
  word: string;
  message: string;
  suggestions: string[];
  ruleId: string;
}

export interface SpellcheckReportMeta {
  scannedInBatch: number;
  issuesInBatch: number;
  totalSongs: number;
  totalScanned: number;
  provider: 'languagetool-self-hosted';
  language: string;
}

export interface SpellcheckReportResponse {
  issues: SpellcheckIssue[];
  nextCursor: string | null;
  meta: SpellcheckReportMeta;
}