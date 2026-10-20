import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { ApplicationsList } from '@/features/applications/components/applications-list';

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = Number(searchParams.get('page'));
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My applications</h1>
          <p className="text-muted-foreground text-sm">
            Statuses update here as decisions are made.
          </p>
        </div>
        <Button asChild>
          <Link to={paths.applications.new}>New application</Link>
        </Button>
      </div>
      <ApplicationsList
        page={page}
        onPageChange={(next) => setSearchParams({ page: String(next) })}
      />
    </div>
  );
}
