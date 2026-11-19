import { useLayoutEffect, useState } from 'react';
import type { OpenLpTheme } from './openLpThemeTypes';
import { openLpSlidePlainLines } from './openLpFormattingTags';

/**
 * Scales theme main font (pt) to pixels and shrinks when lines do not fit —
 * similar to OpenLP “fit verse on slide” behaviour.
 */
export function useOpenLpMainFontSize(
  containerEl: HTMLElement | null,
  slideText: string,
  theme: OpenLpTheme
): number {
  const [fontSizePx, setFontSizePx] = useState(48);

  useLayoutEffect(() => {
    if (!containerEl || !slideText.trim()) return;

    const measure = () => {
      const rect = containerEl.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;

      const scale = Math.min(
        rect.width / theme.referenceWidth,
        rect.height / theme.referenceHeight
      );
      const ptToPx = (pt: number) => pt * (96 / 72) * scale;

      const lines = openLpSlidePlainLines(slideText);
      const lineCount = Math.max(lines.length, 1);
      const maxLineLen = lines.reduce((max, line) => Math.max(max, line.length), 0) || 1;

      const padding = Math.max(8, rect.width * 0.04);
      const availableW = Math.max(rect.width - padding * 2, 40);
      const availableH = Math.max(rect.height - padding * 2, 40);
      const lineHeight = 1 + theme.main.lineAdjustment / 100;

      const base = ptToPx(theme.main.sizePt);
      const heightBased = availableH / lineCount / lineHeight;
      const widthBased = (availableW / Math.max(maxLineLen, 1)) / 0.55;
      const optimal = Math.min(base, heightBased, widthBased);
      setFontSizePx(Math.max(10, Math.floor(optimal)));
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(containerEl);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, [containerEl, slideText, theme]);

  return fontSizePx;
}