export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export const IMAGE_VARIANTS = [
  { name: 'sm', width: 320 },
  { name: 'md', width: 768 },
  { name: 'lg', width: 1440 },
] as const;

export const MAX_BASE64_LENGTH = Math.ceil(MAX_MEDIA_BYTES / 3) * 4;