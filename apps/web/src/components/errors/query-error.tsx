import { CircleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type QueryErrorProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

/** Inline failure state for a section that could not load. */
export function QueryError({
  title = 'Could not load data',
  message,
  onRetry,
}: QueryErrorProps) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {onRetry ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
