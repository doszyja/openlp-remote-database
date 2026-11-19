import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import type { OpenLpTheme } from '../openlp/openLpThemeTypes';
import { DEFAULT_OPENLP_THEME } from '../openlp/defaultOpenLpTheme';
import { openLpFormattingTagsToHtml } from '../openlp/openLpFormattingTags';
import { useOpenLpMainFontSize } from '../openlp/useOpenLpMainFontSize';

export interface OpenLpSlideDisplayProps {
  slideText: string;
  footerText?: string;
  theme?: OpenLpTheme;
  /** Embedded preview uses 16/9; fullscreen uses fillParent. */
  aspectRatio?: string | null;
  fillParent?: boolean;
  className?: string;
}

function verticalAlignCss(align: OpenLpTheme['display']['vertical']): string {
  if (align === 'top') return 'top';
  if (align === 'bottom') return 'bottom';
  return 'middle';
}

function horizontalAlignCss(align: OpenLpTheme['display']['horizontal']): string {
  if (align === 'right') return 'right';
  if (align === 'justify') return 'justify';
  if (align === 'center') return 'center';
  return 'left';
}

function mainAreaRect(theme: OpenLpTheme) {
  const loc = theme.main.location;
  if (!loc.override) {
    return { left: 0, top: 0, width: 100, height: 87 };
  }
  const { referenceWidth: w, referenceHeight: h } = theme;
  return {
    left: (loc.x / w) * 100,
    top: (loc.y / h) * 100,
    width: (loc.width / w) * 100,
    height: (loc.height / h) * 100,
  };
}

function footerAreaRect(theme: OpenLpTheme) {
  const loc = theme.footer.location;
  const { referenceWidth: w, referenceHeight: h } = theme;
  const left = (loc.x / w) * 100;
  const width = (loc.width / w) * 100;
  const bottom = ((h - loc.y - loc.height) / h) * 100;
  const height = (loc.height / h) * 100;
  return { left, width, bottom, height };
}

/**
 * Song slide renderer aligned with OpenLP theme layout (main lyrics + footer title).
 */
export default function OpenLpSlideDisplay({
  slideText,
  footerText,
  theme = DEFAULT_OPENLP_THEME,
  aspectRatio = '16 / 9',
  fillParent = false,
  className,
}: OpenLpSlideDisplayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mainAreaEl, setMainAreaEl] = useState<HTMLDivElement | null>(null);
  const [layoutScale, setLayoutScale] = useState(1);
  const setMainRef = useCallback((el: HTMLDivElement | null) => {
    setMainAreaEl(el);
  }, []);

  const html = useMemo(() => openLpFormattingTagsToHtml(slideText), [slideText]);
  const mainFontPx = useOpenLpMainFontSize(mainAreaEl, slideText, theme);

  const mainRect = mainAreaRect(theme);
  const footerRect = footerAreaRect(theme);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = () => {
      const h = root.getBoundingClientRect().height;
      setLayoutScale(h > 0 ? h / theme.referenceHeight : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => ro.disconnect();
  }, [theme.referenceHeight]);

  const bgSx = useMemo(() => {
    if (theme.background.type === 'gradient' && theme.background.gradientStart) {
      return {
        background: `linear-gradient(${theme.background.gradientDirection ?? 'vertical'}, ${theme.background.gradientStart}, ${theme.background.gradientEnd ?? theme.background.gradientStart})`,
      };
    }
    return { bgcolor: theme.background.color ?? '#000000' };
  }, [theme]);

  const footerSizePx = theme.footer.sizePt * (96 / 72) * layoutScale;

  const mainWeight = theme.main.bold ? 700 : 400;
  const mainStyle = theme.main.italics ? 'italic' : 'normal';
  const lineHeight = 1 + theme.main.lineAdjustment / 100;

  const mainShadow = theme.main.shadow.enabled
    ? `${theme.main.shadow.sizePx}px ${theme.main.shadow.sizePx}px 0 ${theme.main.shadow.color}`
    : undefined;

  const mainOutline = theme.main.outline.enabled
    ? `${theme.main.outline.sizePx}px ${theme.main.outline.color}`
    : undefined;

  return (
    <Box
      ref={rootRef}
      className={className}
      sx={{
        position: 'relative',
        width: '100%',
        ...(fillParent ? { height: '100%', minHeight: 0 } : { aspectRatio: aspectRatio ?? '16 / 9' }),
        maxWidth: '100%',
        overflow: 'hidden',
        ...bgSx,
        userSelect: 'none',
      }}
    >
      <Box
        ref={setMainRef}
        sx={{
          position: 'absolute',
          left: `${mainRect.left}%`,
          top: `${mainRect.top}%`,
          width: `${mainRect.width}%`,
          height: `${mainRect.height}%`,
          display: 'table',
          tableLayout: 'fixed',
        }}
      >
        <Box
          component="div"
          sx={{
            display: 'table-cell',
            verticalAlign: verticalAlignCss(theme.display.vertical),
            textAlign: horizontalAlignCss(theme.display.horizontal),
            px: 1,
          }}
        >
          <Box
            component="div"
            sx={{
              color: theme.main.color,
              fontFamily: `"${theme.main.name}", Verdana, sans-serif`,
              fontSize: `${mainFontPx}px`,
              fontWeight: mainWeight,
              fontStyle: mainStyle,
              lineHeight,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              margin: 0,
              textShadow: mainShadow,
              WebkitTextStroke: mainOutline,
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </Box>
      </Box>

      {footerText ? (
        <Box
          sx={{
            position: 'absolute',
            left: `${footerRect.left}%`,
            bottom: `${footerRect.bottom}%`,
            width: `${footerRect.width}%`,
            height: `${footerRect.height}%`,
            display: 'flex',
            alignItems: 'center',
            color: theme.footer.color,
            fontFamily: `"${theme.footer.name}", Verdana, sans-serif`,
            fontSize: `${Math.max(10, footerSizePx)}px`,
            fontWeight: theme.footer.bold ? 700 : 400,
            fontStyle: theme.footer.italics ? 'italic' : 'normal',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'left',
          }}
        >
          {footerText}
        </Box>
      ) : null}
    </Box>
  );
}