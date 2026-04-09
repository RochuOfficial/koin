import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-surface pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
}
