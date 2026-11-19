/** 24-char hex MongoDB ObjectId (e.g. `id` from GET /api/auth/me). */
export function isMongoObjectId(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length === 24 && /^[a-f0-9]{24}$/i.test(trimmed);
}