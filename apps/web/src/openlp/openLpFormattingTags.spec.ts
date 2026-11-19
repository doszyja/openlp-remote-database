import { describe, expect, it } from 'vitest';
import {
  normalizeOpenLpSlideSource,
  openLpFormattingTagsToHtml,
  openLpSlidePlainLines,
} from './openLpFormattingTags';

describe('openLpFormattingTags', () => {
  it('normalizes br tags to newlines', () => {
    expect(normalizeOpenLpSlideSource('A<br/>B<br />C')).toBe('A\nB\nC');
  });

  it('renders bold and italic spans', () => {
    const html = openLpFormattingTagsToHtml('Hello {st}world{/st}{it}!{/it}');
    expect(html).toContain('<span style="font-weight:bold">world</span>');
    expect(html).toContain('<span style="font-style:italic">!</span>');
    expect(html).not.toContain('{st}');
  });

  it('escapes raw HTML in lyrics', () => {
    const html = openLpFormattingTagsToHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('strips tags for plain lines', () => {
    const lines = openLpSlidePlainLines('Line1{st}x{/st}\n\n  \nLine2');
    expect(lines).toEqual(['Line1x', 'Line2']);
  });
});
