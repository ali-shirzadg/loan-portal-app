import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/testing/server';
import { ApiError, apiClient, setUnauthorizedHandler } from './api-client';
import { shouldRetryQuery } from './react-query';

afterEach(() => setUnauthorizedHandler(undefined));

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('expected the request to fail');
}

describe('api-client error parsing', () => {
  it('maps the server error envelope onto ApiError (status, message, fieldErrors)', async () => {
    server.use(
      http.post('*/api/applications', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Validation failed',
            errors: { nric: ['nric must be a valid Malaysian NRIC'] },
          },
          { status: 400 },
        ),
      ),
    );

    const error = await failure(apiClient.post('/applications', {}));

    expect(error.status).toBe(400);
    expect(error.message).toBe('Validation failed');
    expect(error.fieldErrors).toEqual({
      nric: ['nric must be a valid Malaysian NRIC'],
    });
  });

  it('falls back to the status text when the body is not the error envelope', async () => {
    server.use(
      http.get(
        '*/api/loan-purposes',
        () =>
          new HttpResponse('<html>bad gateway</html>', {
            status: 502,
            statusText: 'Bad Gateway',
          }),
      ),
    );

    const error = await failure(apiClient.get('/loan-purposes'));

    expect(error.status).toBe(502);
    expect(error.message).toBe('Bad Gateway');
    expect(error.fieldErrors).toBeUndefined();
    expect(error.isServerError).toBe(true);
  });

  it('reports a network failure as status 0', async () => {
    server.use(http.get('*/api/loan-purposes', () => HttpResponse.error()));

    const error = await failure(apiClient.get('/loan-purposes'));

    expect(error.isNetworkError).toBe(true);
  });

  it('sends credentials and returns the parsed body', async () => {
    server.use(http.get('*/api/auth/me', () => HttpResponse.json({ id: '1' })));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(apiClient.get('/auth/me')).resolves.toEqual({ id: '1' });

    expect(fetchSpy.mock.calls[0][1]?.credentials).toBe('include');
    fetchSpy.mockRestore();
  });
});

describe('401 handling', () => {
  const unauthorized = () =>
    http.get('*/api/applications', () =>
      HttpResponse.json(
        { statusCode: 401, message: 'Unauthorized' },
        { status: 401 },
      ),
    );

  it('calls the registered handler on a 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    server.use(unauthorized());

    await failure(apiClient.get('/applications'));

    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call it when the caller expects a 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    server.use(unauthorized());

    await failure(
      apiClient.get('/applications', { skipUnauthorizedHandler: true }),
    );

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('query retry policy', () => {
  it('retries network and 5xx errors, at most twice', () => {
    expect(shouldRetryQuery(0, new ApiError(0, 'offline'))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError(503, 'down'))).toBe(true);
    expect(shouldRetryQuery(2, new ApiError(503, 'down'))).toBe(false);
  });

  it('never retries 4xx or unknown errors', () => {
    expect(shouldRetryQuery(0, new ApiError(404, 'missing'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(429, 'slow down'))).toBe(false);
    expect(shouldRetryQuery(0, new Error('boom'))).toBe(false);
  });
});
