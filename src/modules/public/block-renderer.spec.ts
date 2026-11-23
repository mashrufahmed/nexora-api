import { describe, expect, it } from 'vitest';
import { renderPublicBlocks } from './block-renderer.js';

describe('renderPublicBlocks', () => {
  it('keeps supported blocks and only allows HTTPS URLs', () => {
    expect(
      renderPublicBlocks([
        { type: 'callout', tone: 'info' },
        { type: 'affiliateButton', url: 'https://example.com/buy' },
        { type: 'affiliateButton', url: 'javascript:alert(1)' },
        { type: 'unknown' },
      ]),
    ).toEqual([
      { type: 'callout', data: { tone: 'info' } },
      { type: 'affiliateButton', data: { url: 'https://example.com/buy' } },
    ]);
  });
});