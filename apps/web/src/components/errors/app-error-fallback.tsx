import { Button } from '@/components/ui/button';

/** Last-resort fallback for the top-level error boundary / router errorElement. */
export function AppErrorFallback() {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        An unexpected error occurred. Reloading usually fixes it.
      </p>
      <Button onClick={() => window.location.reload()}>Reload page</Button>
    </div>
  );
}
