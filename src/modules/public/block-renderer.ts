export type PublicBlock = {
  type:
    | 'specs'
    | 'prosCons'
    | 'callout'
    | 'faq'
    | 'productCard'
    | 'affiliateButton';
  [key: string]: unknown;
};

export type RenderedPublicBlock = {
  type: PublicBlock['type'];
  data: Record<string, unknown>;
};

const allowedTypes = new Set<PublicBlock['type']>([
  'specs',
  'prosCons',
  'callout',
  'faq',
  'productCard',
  'affiliateButton',
]);

function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function renderPublicBlocks(value: unknown): RenderedPublicBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const block = item as PublicBlock;
    if (!allowedTypes.has(block.type)) return [];
    const { type, ...data } = block;
    if (block.type === 'affiliateButton' || block.type === 'productCard') {
      const url = safeUrl(block.url);
      if (block.url !== undefined && !url) return [];
      if (url) data.url = url;
    }
    return [{ type, data }];
  });
}