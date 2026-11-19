import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseOpenLpThemeXml } from './parseOpenLpThemeXml';

const defaultThemeXml = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'default-theme.xml'),
  'utf-8'
);

describe('parseOpenLpThemeXml', () => {
  it('parses bundled default theme', () => {
    const theme = parseOpenLpThemeXml(defaultThemeXml);

    expect(theme.name).toBe('OpenLP Default (preview)');
    expect(theme.background).toEqual({
      type: 'solid',
      color: '#000000',
      gradientStart: undefined,
      gradientEnd: undefined,
      gradientDirection: undefined,
      imageFilename: undefined,
    });
    expect(theme.display).toEqual({
      horizontal: 'center',
      vertical: 'middle',
      slideTransition: false,
    });
    expect(theme.main.name).toBe('Verdana');
    expect(theme.main.color).toBe('#ffffff');
    expect(theme.main.sizePt).toBe(72);
    expect(theme.main.location.width).toBe(1024);
    expect(theme.main.location.height).toBe(668);
    expect(theme.footer.sizePt).toBe(18);
    expect(theme.referenceWidth).toBe(1024);
    expect(theme.referenceHeight).toBe(768);
  });

  it('normalizes display alignment aliases', () => {
    const xml = `<?xml version="1.0"?><theme name="T">
      <background type="solid"><color>#111</color></background>
      <display>
        <horizontalAlign>RIGHT</horizontalAlign>
        <verticalAlign>Top</verticalAlign>
        <slideTransition>True</slideTransition>
      </display>
    </theme>`;

    const theme = parseOpenLpThemeXml(xml);
    expect(theme.display.horizontal).toBe('right');
    expect(theme.display.vertical).toBe('top');
    expect(theme.display.slideTransition).toBe(true);
  });

  it('throws on invalid XML', () => {
    expect(() => parseOpenLpThemeXml('<not-a-theme/>')).toThrow('Invalid OpenLP theme XML');
  });
});
