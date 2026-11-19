import defaultThemeXml from './default-theme.xml?raw';
import { parseOpenLpThemeXml } from './parseOpenLpThemeXml';

/** Embedded OpenLP theme used as the basis for on-screen song preview (1024×768 layout). */
export const DEFAULT_OPENLP_THEME = parseOpenLpThemeXml(defaultThemeXml);

export { defaultThemeXml as EMBEDDED_OPENLP_THEME_XML };