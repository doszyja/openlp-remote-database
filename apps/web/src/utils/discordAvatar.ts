/**
 * Discord CDN URL for a user avatar.
 * Custom avatars use the stored hash (`a_` hashes are animated GIFs).
 * Users without a custom avatar use Discord's default embed avatar.
 */
export function discordAvatarUrl(discordId: string, avatar?: string | null): string {
  if (avatar) {
    if (avatar.startsWith('https://') || avatar.startsWith('http://')) {
      return avatar;
    }
    const extension = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${extension}?size=128`;
  }

  let index = 0;
  try {
    index = Number((BigInt(discordId) >> 22n) % 6n);
  } catch {
    index = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
