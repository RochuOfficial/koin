import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Flame, TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ProgressRing';
import { store } from '@/lib/store';
import { AddExpenseModal } from '@/components/AddExpenseModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(store.getProfile());
  const [goals, setGoals] = useState(store.getGoals());
  const [showExpense, setShowExpense] = useState(false);
  const [todaySpend, setTodaySpend] = useState(store.getTodaySpending());

  useEffect(() => {
    if (!profile.onboardingCompleted) {
      navigate('/onboarding');
    }
  }, [profile.onboardingCompleted, navigate]);

  const refresh = () => {
    setProfile(store.getProfile());
    setGoals(store.getGoals());
    setTodaySpend(store.getTodaySpending());
  };

  const primaryGoal = goals.find(g => g.isPrimary) || goals[0];
  const progress = primaryGoal ? Math.round((primaryGoal.savedAmount / primaryGoal.targetAmount) * 100) : 0;

  const daysUntilDeadline = primaryGoal
    ? Math.max(0, Math.ceil((new Date(primaryGoal.deadline).getTime() - Date.now()) / 86400000))
    : 0;

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const streakDots = weekDays.map((d, i) => ({
    label: d,
    active: i < Math.min(profile.streak, 7),
  }));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="px-5 py-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-body-medium text-on-surface-variant">{greeting()}</p>
          <h1 className="text-headline-medium text-on-surface">Koin</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-warning-container px-3.5 py-2">
          <Flame size={16} className="text-warning" />
          <span className="text-label-large text-warning">{profile.streak}</span>
        </div>
      </div>

      {/* Primary Goal Ring */}
      {primaryGoal ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 flex flex-col items-center"
        >
          <ProgressRing progress={progress} size={200} strokeWidth={14}>
            <span className="text-3xl">{primaryGoal.icon}</span>
            <span className="mt-1 text-display-small text-on-surface">{progress}%</span>
            <span className="text-label-medium text-on-surface-variant">{primaryGoal.name}</span>
          </ProgressRing>
          <p className="mt-3 text-title-small text-tertiary">
            ${primaryGoal.savedAmount.toLocaleString()} of ${primaryGoal.targetAmount.toLocaleString()}
          </p>
          <p className="text-body-small text-on-surface-variant">{daysUntilDeadline} days left</p>
        </motion.div>
      ) : (
        <div className="mb-6 rounded-3xl bg-primary-container p-8 text-center">
          <p className="mb-3 text-title-large text-on-primary-container">Create your first goal</p>
          <Button onClick={() => navigate('/goals')} className="gap-2">
            <Plus size={16} /> New Goal
          </Button>
        </div>
      )}

      {/* Motivational Copy */}
      {primaryGoal && progress > 0 && (
        <div className="mb-5 rounded-2xl bg-tertiary-container p-4 text-center">
          <p className="text-body-medium text-on-tertiary-container font-medium">
            {progress < 25 ? "Great start! Every dollar counts 🌱" :
             progress < 50 ? `You're ${progress}% closer to your ${primaryGoal.name}! 💪` :
             progress < 75 ? "Halfway hero! Keep this momentum going 🚀" :
             "Almost there! Your goal is within reach 👑"}
          </p>
        </div>
      )}

      {/* Streak + Today */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="mb-2 text-label-medium text-on-surface-variant">Weekly Streak</p>
          <div className="flex justify-between">
            {streakDots.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`h-3 w-3 rounded-full ${d.active ? 'bg-tertiary' : 'bg-surface-container'}`} />
                <span className="text-label-small text-on-surface-variant">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-surface-container-low p-4">
          <p className="mb-1 text-label-medium text-on-surface-variant">Today's Spending</p>
          <p className="text-headline-small text-on-surface">${todaySpend.toFixed(0)}</p>
          <p className="text-label-small text-on-surface-variant">across {profile.expenses.filter(e => e.date === new Date().toISOString().split('T')[0]).length} expenses</p>
        </div>
      </div>

      {/* Quick Add Expense */}
      <Button
        onClick={() => setShowExpense(true)}
        variant="tonal"
        className="mb-5 w-full h-12 gap-2"
      >
        <Plus size={16} /> Quick Add Expense
      </Button>

      {/* Level & Progress */}
      <div className="mb-5 rounded-2xl bg-surface-container-low p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <span className="text-title-small text-on-surface">Saver Lv.{profile.level}</span>
          </div>
          <span className="text-label-medium text-on-surface-variant">{profile.xp % 100}/100 XP</span>
        </div>
        <div className="h-1 w-full rounded-full bg-surface-container">
          <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${profile.xp % 100}%` }} />
        </div>
      </div>

      {/* Goals list */}
      {goals.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-title-medium text-on-surface">Your Goals</h2>
            <button onClick={() => navigate('/goals')} className="text-label-large text-primary flex items-center gap-0.5">
              See all <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {goals.slice(0, 3).map(g => (
              <div key={g.id} className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 min-h-[56px]">
                <span className="text-2xl">{g.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-title-small text-on-surface truncate">{g.name}</p>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-surface-container">
                    <div className="h-1 rounded-full bg-tertiary" style={{ width: `${Math.round((g.savedAmount / g.targetAmount) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-label-large text-on-surface-variant">
                  {Math.round((g.savedAmount / g.targetAmount) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddExpenseModal open={showExpense} onClose={() => { setShowExpense(false); refresh(); }} />
    </div>
  );
}
