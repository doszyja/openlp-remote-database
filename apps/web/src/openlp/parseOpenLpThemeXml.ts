import type { OpenLpAlignH, OpenLpAlignV, OpenLpFontBlock, OpenLpTheme } from './openLpThemeTypes';

const REF_W = 1024;
const REF_H = 768;

function textOf(parent: Element | Document, tag: string): string {
  return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

function parseBool(value: string | null | undefined): boolean {
  return String(value).toLowerCase() === 'true';
}

function parseFontBlock(fontEl: Element | null): OpenLpFontBlock {
  const locationEl = fontEl?.getElementsByTagName('location')[0];
  const shadowEl = fontEl?.getElementsByTagName('shadow')[0];
  const outlineEl = fontEl?.getElementsByTagName('outline')[0];

  return {
    name: textOf(fontEl ?? document.createElement('font'), 'name') || 'Verdana',
    color: textOf(fontEl ?? document.createElement('font'), 'color') || '#ffffff',
    sizePt: Number.parseInt(textOf(fontEl ?? document.createElement('font'), 'size') || '72', 10) || 72,
    bold: parseBool(textOf(fontEl ?? document.createElement('font'), 'bold')),
    italics: parseBool(textOf(fontEl ?? document.createElement('font'), 'italics')),
    lineAdjustment: Number.parseInt(
      textOf(fontEl ?? document.createElement('font'), 'line_adjustment') || '0',
      10
    ) || 0,
    location: {
      override: parseBool(locationEl?.getAttribute('override')),
      x: Number.parseInt(locationEl?.getAttribute('x') ?? '0', 10) || 0,
      y: Number.parseInt(locationEl?.getAttribute('y') ?? '0', 10) || 0,
      width: Number.parseInt(locationEl?.getAttribute('width') ?? String(REF_W), 10) || REF_W,
      height: Number.parseInt(locationEl?.getAttribute('height') ?? String(REF_H), 10) || REF_H,
    },
    shadow: {
      enabled: parseBool(shadowEl?.textContent),
      color: shadowEl?.getAttribute('shadowColor') ?? '#000000',
      sizePx: Number.parseInt(shadowEl?.getAttribute('shadowSize') ?? '5', 10) || 5,
    },
    outline: {
      enabled: parseBool(outlineEl?.textContent),
      color: outlineEl?.getAttribute('outlineColor') ?? '#000000',
      sizePx: Number.parseInt(outlineEl?.getAttribute('outlineSize') ?? '2', 10) || 2,
    },
  };
}

function normalizeAlignH(value: string): OpenLpAlignH {
  const v = value.toLowerCase();
  if (v === 'right' || v === 'justify') return v;
  if (v === 'center') return 'center';
  return 'left';
}

function normalizeAlignV(value: string): OpenLpAlignV {
  const v = value.toLowerCase();
  if (v === 'top') return 'top';
  if (v === 'bottom') return 'bottom';
  return 'middle';
}

export function parseOpenLpThemeXml(xml: string): OpenLpTheme {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const themeEl = doc.getElementsByTagName('theme')[0];
  if (!themeEl || doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid OpenLP theme XML');
  }

  const bgEl = themeEl.getElementsByTagName('background')[0];
  const bgType = (bgEl?.getAttribute('type') ?? 'solid').toLowerCase();
  const displayEl = themeEl.getElementsByTagName('display')[0];
  const fonts = themeEl.getElementsByTagName('font');

  let mainFont: Element | null = null;
  let footerFont: Element | null = null;
  for (let i = 0; i < fonts.length; i++) {
    const type = fonts[i].getAttribute('type');
    if (type === 'main') mainFont = fonts[i];
    if (type === 'footer') footerFont = fonts[i];
  }

  return {
    name: themeEl.getAttribute('name') ?? 'Theme',
    background: {
      type:
        bgType === 'gradient' || bgType === 'image' || bgType === 'transparent' ? bgType : 'solid',
      color: textOf(bgEl ?? themeEl, 'color') || '#000000',
      gradientStart: textOf(bgEl ?? themeEl, 'startColor') || undefined,
      gradientEnd: textOf(bgEl ?? themeEl, 'endColor') || undefined,
      gradientDirection: textOf(bgEl ?? themeEl, 'direction') || undefined,
      imageFilename: textOf(bgEl ?? themeEl, 'filename') || undefined,
    },
    display: {
      horizontal: normalizeAlignH(textOf(displayEl ?? themeEl, 'horizontalAlign') || 'center'),
      vertical: normalizeAlignV(textOf(displayEl ?? themeEl, 'verticalAlign') || 'middle'),
      slideTransition: parseBool(textOf(displayEl ?? themeEl, 'slideTransition')),
    },
    main: parseFontBlock(mainFont),
    footer: parseFontBlock(footerFont),
    referenceWidth: REF_W,
    referenceHeight: REF_H,
  };
}