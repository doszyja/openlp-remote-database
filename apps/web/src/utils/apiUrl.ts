/**
 * Get the API URL based on environment
 * In development, uses relative path (via Vite proxy)
 * In production, uses relative path (via nginx proxy) to avoid Mixed Content issues
 */
export function getApiUrl(): string {
  // Always use relative paths - nginx handles proxying to the API
  // This avoids Mixed Content issues when frontend is served over HTTPS
  return '/api';
}

/**
 * Get the full API URL for OAuth redirects
 * This is needed because OAuth redirects must use absolute URLs
 */
export function getApiUrlForOAuth(): string {
  const apiUrl = getApiUrl();

  // If it's already a full URL (starts with http:// or https://), return as is
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return apiUrl;
  }

  // If it's a relative path, construct full URL from current origin
  // This handles the case where frontend and backend are on the same domain
  const origin = window.location.origin;
  return `${origin}${apiUrl}`;
}
