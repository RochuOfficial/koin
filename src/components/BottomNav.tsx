import { Home, Target, Zap, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/goals', icon: Target, label: 'Goals' },
  { path: '/missions', icon: Zap, label: 'Missions' },
  { path: '/coach', icon: MessageCircle, label: 'Coach' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-container-low safe-bottom">
      <div className="mx-auto flex max-w-[430px] items-center justify-around h-20">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 px-3 py-1 min-w-[48px] min-h-[48px] justify-center transition-colors"
            >
              <div className={cn(
                'flex items-center justify-center rounded-full transition-all duration-200',
                active
                  ? 'bg-primary-container w-16 h-8'
                  : 'w-8 h-8'
              )}>
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.6}
                  className={cn(
                    'transition-colors',
                    active ? 'text-on-primary-container' : 'text-on-surface-variant'
                  )}
                />
              </div>
              <span className={cn(
                'text-label-small',
                active ? 'text-on-surface font-semibold' : 'text-on-surface-variant'
              )}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
