import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './format';

describe('date formatting', () => {
  it('renders UTC timestamps in Kuala Lumpur time (UTC+8)', () => {
    // 20:30 UTC on the 20th is 04:30 on the 21st in Kuala Lumpur.
    expect(formatDate('2026-10-20T20:30:00.000Z')).toBe('21 Oct 2026');
    expect(formatDateTime('2026-10-20T20:30:00.000Z')).toMatch(
      /^21 Oct 2026, 04:30\s?am$/i,
    );
  });
});
