import { describe, expect, it } from 'vitest';
import { createQueryClient } from './react-query';

describe('createQueryClient', () => {
  it('never retries mutations (FR-APP-4)', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('uses the shared retry policy for queries', () => {
    const client = createQueryClient();
    expect(typeof client.getDefaultOptions().queries?.retry).toBe('function');
  });
});
