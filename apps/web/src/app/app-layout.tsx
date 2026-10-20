import { Landmark, LogOutIcon, UserIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Role } from '@loan-portal/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { landingPath, paths } from '@/config/paths';
import { useApplicationEvents } from '@/features/applications/hooks/use-application-events';
import { useUser } from '@/features/auth/api/get-user';
import { useLogout } from '@/features/auth/api/logout';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-secondary text-foreground'
      : 'text-muted-foreground hover:text-foreground',
  );

/** Shell for signed-in pages: header navigation, account menu, and the live-update connection. */
export function AppLayout() {
  const { data: user } = useUser();
  const logout = useLogout();
  const navigate = useNavigate();

  // Only customers receive status events (FR-RT-2).
  useApplicationEvents(user?.role === Role.CUSTOMER);

  if (!user) return null;

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => navigate(paths.login, { replace: true }),
    });

  return (
    <div className="bg-muted/30 min-h-screen">
      <header className="bg-background border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <NavLink
            to={landingPath(user.role)}
            className="flex items-center gap-2 font-semibold"
          >
            <Landmark className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">Loan Portal</span>
          </NavLink>
          <nav aria-label="Main" className="flex flex-1 items-center gap-1">
            {user.role === Role.CUSTOMER ? (
              <>
                <NavLink
                  end
                  to={paths.applications.root}
                  className={navLinkClass}
                >
                  My applications
                </NavLink>
                <NavLink to={paths.applications.new} className={navLinkClass}>
                  Apply
                </NavLink>
              </>
            ) : (
              <NavLink to={paths.admin.applications} className={navLinkClass}>
                All applications
              </NavLink>
            )}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="Account menu">
                <UserIcon />
                <span className="hidden max-w-32 truncate sm:inline">
                  {user.fullName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="font-medium">{user.fullName}</div>
                <div className="text-muted-foreground text-xs font-normal">
                  {user.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOutIcon />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
