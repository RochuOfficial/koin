import { useState } from 'react';
import { store, EXPENSE_CATEGORIES } from '@/lib/store';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, CreditCard, User, RotateCcw } from 'lucide-react';

export default function Profile() {
  const [profile, setProfile] = useState(store.getProfile());
  const goals = store.getGoals();
  const achievements = store.getAchievements();

  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const unlockedBadges = achievements.filter(a => a.unlocked).length;

  const toggleNotif = (key: keyof typeof profile.notificationPrefs) => {
    const updated = { ...profile, notificationPrefs: { ...profile.notificationPrefs, [key]: !profile.notificationPrefs[key] } };
    store.setProfile(updated);
    setProfile(updated);
  };

  const handleReset = () => {
    if (confirm('Reset all data? This cannot be undone.')) {
      store.resetForDemo();
      window.location.href = '/';
    }
  };

  const expensesByCategory = profile.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="px-5 py-6 animate-fade-in">
      {/* User card */}
      <div className="mb-6 rounded-3xl bg-primary-container p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
          <User size={28} className="text-on-primary-container" />
        </div>
        <h1 className="text-title-large text-on-primary-container">Saver Lv.{profile.level}</h1>
        <p className="text-body-medium text-on-primary-container/70">{profile.personalityType ? `${profile.personalityType.charAt(0).toUpperCase() + profile.personalityType.slice(1)} personality` : 'Financial explorer'}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-title-medium text-on-primary-container">${totalSaved}</p>
            <p className="text-label-small text-on-primary-container/60">Total Saved</p>
          </div>
          <div>
            <p className="text-title-medium text-on-primary-container">{goals.length}</p>
            <p className="text-label-small text-on-primary-container/60">Goals</p>
          </div>
          <div>
            <p className="text-title-medium text-on-primary-container">{unlockedBadges}</p>
            <p className="text-label-small text-on-primary-container/60">Badges</p>
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="mb-5 rounded-2xl bg-surface-container-low p-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={16} className="text-on-surface-variant" />
          <span className="text-title-small text-on-surface">Monthly Income</span>
        </div>
        <p className="text-headline-small text-on-surface">${profile.monthlyIncome.toLocaleString()}</p>
      </div>

      {/* Expense breakdown */}
      {Object.keys(expensesByCategory).length > 0 && (
        <div className="mb-5 rounded-2xl bg-surface-container-low p-4">
          <h3 className="mb-3 text-title-small text-on-surface">Expense Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a).map(([cat, amount]) => {
              const c = EXPENSE_CATEGORIES.find(x => x.id === cat);
              return (
                <div key={cat} className="flex items-center justify-between min-h-[48px]">
                  <div className="flex items-center gap-2">
                    <span>{c?.icon || '📌'}</span>
                    <span className="text-body-medium text-on-surface">{c?.name || cat}</span>
                  </div>
                  <span className="text-label-large text-on-surface">${amount}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="mb-5 rounded-2xl bg-surface-container-low p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-on-surface-variant" />
          <span className="text-title-small text-on-surface">Notifications</span>
        </div>
        <div className="space-y-1">
          {([
            ['paydayReminder', 'Payday saving reminder'],
            ['streakProtection', 'Streak protection alert'],
            ['milestoneAlerts', 'Milestone celebrations'],
            ['weeklyReflection', 'Weekly reflection'],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between min-h-[56px]">
              <span className="text-body-medium text-on-surface">{label}</span>
              <Switch checked={profile.notificationPrefs[key]} onCheckedChange={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <Button variant="outline" onClick={handleReset} className="w-full gap-2 text-on-surface-variant">
        <RotateCcw size={14} /> Reset All Data (Demo)
      </Button>
    </div>
  );
}
