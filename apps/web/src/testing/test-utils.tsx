import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/** A client that fails fast: tests assert on first outcomes, not on retry timing. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function createWrapper(
  queryClient: QueryClient,
  initialEntries: string[] = ['/'],
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={initialEntries}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: { queryClient?: QueryClient; initialEntries?: string[] } = {},
) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  return {
    queryClient,
    ...render(ui, {
      wrapper: createWrapper(queryClient, options.initialEntries),
    }),
  };
}
