import { ApplicationStatus } from '@loan-portal/shared';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, createWrapper } from '@/testing/test-utils';
import { applicationKeys } from '../api/application-keys';
import { useApplicationEvents } from './use-application-events';

class MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static instances: MockEventSource[] = [];

  readyState = MockEventSource.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });

  constructor(
    readonly url: string,
    readonly init?: EventSourceInit,
  ) {
    MockEventSource.instances.push(this);
  }

  emit(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

const latest = () =>
  MockEventSource.instances[MockEventSource.instances.length - 1];

function setup(enabled = true) {
  const queryClient = createTestQueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const hook = renderHook(() => useApplicationEvents(enabled), {
    wrapper: createWrapper(queryClient),
  });
  return { invalidate, ...hook };
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useApplicationEvents', () => {
  it('opens one credentialed connection and closes it on unmount', () => {
    const { unmount } = setup();

    expect(MockEventSource.instances).toHaveLength(1);
    expect(latest().url).toBe('/api/applications/events');
    expect(latest().init).toEqual({ withCredentials: true });

    unmount();
    expect(latest().close).toHaveBeenCalled();
  });

  it('does not connect when disabled', () => {
    setup(false);
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('invalidates the lists and the affected detail on a status event', () => {
    const { invalidate } = setup();

    latest().emit(
      JSON.stringify({
        applicationId: 'app-1',
        status: ApplicationStatus.APPROVED,
        decidedAt: '2026-10-20T10:00:00.000Z',
      }),
    );

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: applicationKeys.lists(),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: applicationKeys.detail('app-1'),
    });
  });

  it('ignores malformed payloads', () => {
    const { invalidate } = setup();

    latest().emit('not json');
    latest().emit(JSON.stringify({ applicationId: 7 }));

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('refetches everything when a dropped connection reopens (FR-RT-3)', () => {
    const { invalidate } = setup();

    latest().onopen?.();
    expect(invalidate).not.toHaveBeenCalled();

    latest().onerror?.();
    latest().onopen?.();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: applicationKeys.all });
  });

  it('opens a new connection itself when the browser gave up', () => {
    vi.useFakeTimers();
    setup();

    latest().readyState = MockEventSource.CLOSED;
    latest().onerror?.();
    expect(MockEventSource.instances).toHaveLength(1);

    vi.advanceTimersByTime(3000);
    expect(MockEventSource.instances).toHaveLength(2);
  });
});
