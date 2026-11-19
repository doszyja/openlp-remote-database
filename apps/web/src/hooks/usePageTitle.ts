import { useEffect } from 'react';

/** Must match primary title in apps/web/index.html */
export const APP_PAGE_TITLE = 'Świętochłowice Kościół Wolnych Chrześcijan - Śpiewnik';

/**
 * Sets document.title to `{part} | {APP_PAGE_TITLE}` or app default when part is empty.
 * Restores previous title on unmount.
 */
export function usePageTitle(part: string | null | undefined) {
  useEffect(() => {
    const previous = document.title;
    const trimmed = part?.trim();
    document.title = trimmed ? `${trimmed} | ${APP_PAGE_TITLE}` : APP_PAGE_TITLE;
    return () => {
      document.title = previous;
    };
  }, [part]);
}