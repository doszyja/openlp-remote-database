export type ParsedClientEnvironment = {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browserName: string;
  osName: string;
};

/** Lightweight User-Agent parsing without extra npm dependencies. */
export function parseUserAgent(userAgent?: string): ParsedClientEnvironment {
  const ua = userAgent?.trim() || '';
  if (!ua) {
    return { deviceType: 'unknown', browserName: 'unknown', osName: 'unknown' };
  }

  let deviceType: ParsedClientEnvironment['deviceType'] = 'desktop';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) {
    deviceType = 'mobile';
  }

  let browserName = 'unknown';
  if (/Edg\//i.test(ua)) browserName = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browserName = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browserName = 'Chrome';
  else if (/Firefox\//i.test(ua)) browserName = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua))
    browserName = 'Safari';

  let osName = 'unknown';
  if (/Windows NT/i.test(ua)) osName = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) osName = 'macOS';
  else if (/Android/i.test(ua)) osName = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) osName = 'iOS';
  else if (/Linux/i.test(ua)) osName = 'Linux';

  return { deviceType, browserName, osName };
}
