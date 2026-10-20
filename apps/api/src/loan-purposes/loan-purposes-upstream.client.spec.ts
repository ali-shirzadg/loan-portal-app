import {
  LoanPurposesUpstreamClient,
  UPSTREAM_DELAY_MS,
} from './loan-purposes-upstream.client';

describe('LoanPurposesUpstreamClient', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('FR-LP-2: takes 2 seconds to answer', async () => {
    const pending = new LoanPurposesUpstreamClient().fetchPurposes();
    let settled = false;
    void pending.then(() => (settled = true));

    await jest.advanceTimersByTimeAsync(UPSTREAM_DELAY_MS - 1);
    expect(settled).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    const purposes = await pending;
    expect(purposes.length).toBeGreaterThanOrEqual(5);
    expect(purposes.map((p) => p.code)).toContain('OTHER');
  });
});
