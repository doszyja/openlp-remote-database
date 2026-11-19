/**
 * Renders OpenLP formatting tags to safe HTML (built-in tags from the 3.x manual).
 * Mirrors openlp/core/lib/htmlbuilder formatting behaviour at a basic level.
 */

const BUILTIN_TAG_STYLES: Record<string, string> = {
  st: 'font-weight:bold',
  it: 'font-style:italic',
  u: 'text-decoration:underline',
  su: 'vertical-align:super;font-size:0.75em',
  sb: 'vertical-align:sub;font-size:0.75em',
  r: 'color:#ff0000',
  b: 'color:#000000',
  bl: 'color:#0000ff',
  y: 'color:#ffff00',
  g: 'color:#00ff00',
  pk: 'color:#ff69b4',
  o: 'color:#ffa500',
  pp: 'color:#800080',
  w: 'color:#ffffff',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normalize legacy `<br/>` in stored lyrics before tag parsing. */
export function normalizeOpenLpSlideSource(text: string): string {
  return text.replace(/<br\s*\/?>/gi, '\n');
}

/**
 * Convert OpenLP slide text (plain + `{tags}`) to HTML safe for `dangerouslySetInnerHTML`.
 */
export function openLpFormattingTagsToHtml(raw: string): string {
  const source = normalizeOpenLpSlideSource(raw);
  let html = '';
  const stack: string[] = [];
  const tagRegex = /\{\/?([a-zA-Z0-9]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (chunk: string) => {
    if (chunk) html += escapeHtml(chunk);
  };

  while ((match = tagRegex.exec(source)) !== null) {
    pushText(source.slice(lastIndex, match.index));
    const tag = match[1].toLowerCase();
    const isClose = match[0].startsWith('{/');

    if (isClose) {
      const style = BUILTIN_TAG_STYLES[tag];
      if (style && stack[stack.length - 1] === tag) {
        html += '</span>';
        stack.pop();
      }
    } else if (tag === 'br') {
      html += '<br/>';
    } else if (tag === 'p') {
      html += '<p style="margin:0">';
      stack.push(tag);
    } else {
      const style = BUILTIN_TAG_STYLES[tag];
      if (style) {
        html += `<span style="${style}">`;
        stack.push(tag);
      }
    }

    lastIndex = match.index + match[0].length;
  }

  pushText(source.slice(lastIndex));
  while (stack.length > 0) {
    html += stack.pop() === 'p' ? '</p>' : '</span>';
  }

  return html;
}

export function openLpSlidePlainLines(text: string): string[] {
  const withoutTags = normalizeOpenLpSlideSource(text).replace(/\{\/?[a-zA-Z0-9]+\}/g, '');
  return withoutTags.split('\n').filter(line => line.trim().length > 0);
}