import { useState, useEffect } from 'react';

export interface FontSizes {
  titleSize: number;
  contentSize: number;
}

/**
 * Hook to calculate responsive font sizes based on viewport dimensions
 * @returns Font sizes object with titleSize and contentSize
 */
export function useResponsiveFontSizes(): FontSizes {
  const [fontSizes, setFontSizes] = useState<FontSizes>({ titleSize: 48, contentSize: 75 });

  useEffect(() => {
    const calculateFontSizes = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const isLandscape = vw > vh;
      const minDimension = Math.min(vh, vw);
      const primaryDimension = isLandscape ? vh : minDimension;
      const isMobile = vw < 600;
      const isTablet = vw >= 600 && vw < 1024;

      let titleSize = 48;
      let contentSize = 75;

      if (isMobile && isLandscape) {
        titleSize = Math.max(24, primaryDimension * 0.08);
        contentSize = Math.max(32, primaryDimension * 0.12);
      } else if (isMobile) {
        titleSize = Math.max(28, primaryDimension * 0.06);
        contentSize = Math.max(40, primaryDimension * 0.1);
      } else if (isTablet) {
        titleSize = Math.max(36, primaryDimension * 0.05);
        contentSize = Math.max(60, primaryDimension * 0.08);
      } else {
        titleSize = Math.max(48, primaryDimension * 0.04);
        contentSize = Math.max(75, primaryDimension * 0.06);
      }

      setFontSizes({ titleSize, contentSize });
    };

    calculateFontSizes();
    window.addEventListener('resize', calculateFontSizes);
    return () => window.removeEventListener('resize', calculateFontSizes);
  }, []);

  return fontSizes;
}

