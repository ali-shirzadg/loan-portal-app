import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApplicationStatus,
  type ApplicationStatusChangedEvent,
} from '@loan-portal/shared';
import { API_URL } from '@/config/env';
import { applicationKeys } from '../api/application-keys';

const RECONNECT_DELAY_MS = 3000;

/** Narrows a parsed SSE payload to the shared event contract. */
export function isStatusChangedEvent(
  value: unknown,
): value is ApplicationStatusChangedEvent {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: Record<string, unknown> = { ...value };
  return (
    typeof candidate['applicationId'] === 'string' &&
    Object.values<unknown>(ApplicationStatus).includes(candidate['status'])
  );
}

/**
 * Live status updates (FR-RT). Each event invalidates the affected list and
 * detail queries so they refetch. EventSource reconnects by itself after a
 * dropped connection; we refetch everything on reopen to catch missed events
 * (FR-RT-3) and reopen manually if the browser gave up (e.g. after a 401).
 */
export function useApplicationEvents(
  enabled: boolean,
  /** Lets the app layer refresh queries owned by other features (e.g. the admin list). */
  onChange?: () => void,
): void {
  const queryClient = useQueryClient();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    let source: EventSource | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let dropped = false;
    let disposed = false;

    const connect = () => {
      source = new EventSource(`${API_URL}/applications/events`, {
        withCredentials: true,
      });

      source.onopen = () => {
        if (dropped) {
          dropped = false;
          void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
          onChangeRef.current?.();
        }
      };

      source.onmessage = (message: MessageEvent<string>) => {
        let payload: unknown;
        try {
          payload = JSON.parse(message.data);
        } catch {
          return;
        }
        if (!isStatusChangedEvent(payload)) return;
        void queryClient.invalidateQueries({
          queryKey: applicationKeys.lists(),
        });
        void queryClient.invalidateQueries({
          queryKey: applicationKeys.detail(payload.applicationId),
        });
        onChangeRef.current?.();
      };

      source.onerror = () => {
        dropped = true;
        // CLOSED means the browser will not retry on its own.
        if (source?.readyState === EventSource.CLOSED && !disposed) {
          source.close();
          retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      source?.close();
    };
  }, [enabled, queryClient]);
}
