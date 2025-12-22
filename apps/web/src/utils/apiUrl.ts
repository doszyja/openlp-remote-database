/**
 * Get the API URL based on environment
 * In development, uses relative path (via Vite proxy)
 * In production, uses VITE_API_URL or falls back to localhost
 */
export function getApiUrl(): string {
  // In development, use relative paths (via Vite proxy)
  if (import.meta.env.DEV) {
    return '/api';
  }

  // In production, use full API URL from env or fallback
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
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
