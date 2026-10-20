import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';

export function Component() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground text-sm">
        The page you are looking for does not exist.
      </p>
      <Button asChild>
        <Link to={paths.home}>Go home</Link>
      </Button>
    </div>
  );
}
