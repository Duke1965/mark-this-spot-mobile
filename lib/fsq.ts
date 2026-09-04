// lib/fsq.ts
export function assembleFsqPhotoUrl(prefix?: string, suffix?: string, size: 'original' | `${number}x${number}` = 'original') {
  if (!prefix || !suffix) return null;
  return `${prefix}${size}${suffix}`;
}

