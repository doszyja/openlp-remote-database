export type OpenLpAlignH = 'left' | 'right' | 'center' | 'justify';
export type OpenLpAlignV = 'top' | 'middle' | 'bottom';

export interface OpenLpFontBlock {
  name: string;
  color: string;
  sizePt: number;
  bold: boolean;
  italics: boolean;
  lineAdjustment: number;
  location: {
    override: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  shadow: { enabled: boolean; color: string; sizePx: number };
  outline: { enabled: boolean; color: string; sizePx: number };
}

export interface OpenLpTheme {
  name: string;
  background: {
    type: 'solid' | 'gradient' | 'image' | 'transparent';
    color?: string;
    gradientStart?: string;
    gradientEnd?: string;
    gradientDirection?: string;
    imageFilename?: string;
  };
  display: {
    horizontal: OpenLpAlignH;
    vertical: OpenLpAlignV;
    slideTransition: boolean;
  };
  main: OpenLpFontBlock;
  footer: OpenLpFontBlock;
  /** OpenLP lays out theme coordinates against a 1024×768 design surface. */
  referenceWidth: number;
  referenceHeight: number;
}