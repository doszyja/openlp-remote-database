/** Remove OpenLP inline formatting tags and normalize whitespace for spell checking. */
export function stripOpenLpTextForSpellcheck(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\{\/?[a-zA-Z0-9]+\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}