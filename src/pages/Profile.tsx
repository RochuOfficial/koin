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

  // Group expenses by category
  const expensesByCategory = profile.expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div className="px-5 py-6 animate-fade-in">
      {/* User card */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <User size={28} className="text-primary" />
        </div>
        <h1 className="text-xl font-bold">Saver Lv.{profile.level}</h1>
        <p className="text-sm text-muted-foreground">{profile.personalityType ? `${profile.personalityType.charAt(0).toUpperCase() + profile.personalityType.slice(1)} personality` : 'Financial explorer'}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-lg font-bold text-accent">${totalSaved}</p>
            <p className="text-[10px] text-muted-foreground">Total Saved</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary">{goals.length}</p>
            <p className="text-[10px] text-muted-foreground">Goals</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warning">{unlockedBadges}</p>
            <p className="text-[10px] text-muted-foreground">Badges</p>
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Monthly Income</span>
        </div>
        <p className="text-2xl font-bold">${profile.monthlyIncome.toLocaleString()}</p>
      </div>

      {/* Expense breakdown */}
      {Object.keys(expensesByCategory).length > 0 && (
        <div className="mb-5 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Expense Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a).map(([cat, amount]) => {
              const c = EXPENSE_CATEGORIES.find(x => x.id === cat);
              return (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{c?.icon || '📌'}</span>
                    <span className="text-sm">{c?.name || cat}</span>
                  </div>
                  <span className="text-sm font-medium">${amount}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">Notifications</span>
        </div>
        <div className="space-y-3">
          {([
            ['paydayReminder', 'Payday saving reminder'],
            ['streakProtection', 'Streak protection alert'],
            ['milestoneAlerts', 'Milestone celebrations'],
            ['weeklyReflection', 'Weekly reflection'],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch checked={profile.notificationPrefs[key]} onCheckedChange={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <Button variant="outline" onClick={handleReset} className="w-full rounded-xl gap-2 text-muted-foreground">
        <RotateCcw size={14} /> Reset All Data (Demo)
      </Button>
    </div>
  );
}
