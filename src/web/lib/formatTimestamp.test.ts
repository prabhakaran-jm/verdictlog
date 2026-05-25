import { describe, expect, it } from 'vitest';
import { formatTimestamp } from './formatTimestamp';

describe('formatTimestamp', () => {
  it('formats epoch zero as UTC', () => {
    expect(formatTimestamp(0)).toBe('1970-01-01 00:00 UTC');
  });

  it('formats a known timestamp', () => {
    expect(formatTimestamp(Date.UTC(2024, 5, 15, 14, 30))).toBe('2024-06-15 14:30 UTC');
  });
});
