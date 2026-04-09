import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProgressRing } from '@/components/ProgressRing';
import { store, GOAL_TEMPLATES, Goal } from '@/lib/store';
import { fireConfetti, fireSmallConfetti } from '@/lib/confetti';

export default function Goals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState(store.getGoals());
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [viewGoal, setViewGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const template = GOAL_TEMPLATES.find(t => t.id === selectedTemplate);

  const startCreate = () => {
    setCreating(true);
    setCreateStep(0);
    setSelectedTemplate('');
    setGoalName('');
    setTargetAmount('');
    setDeadline('');
  };

  const handleTemplateSelect = (id: string) => {
    const t = GOAL_TEMPLATES.find(t => t.id === id)!;
    setSelectedTemplate(id);
    setGoalName(t.name);
    setTargetAmount(String(t.suggestedAmount));
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setDeadline(d.toISOString().split('T')[0]);
  };

  const finishCreate = () => {
    const goal: Goal = {
      id: crypto.randomUUID(),
      template: selectedTemplate,
      icon: template?.icon || '🎯',
      name: goalName,
      targetAmount: Number(targetAmount),
      savedAmount: 0,
      deadline,
      createdAt: new Date().toISOString(),
      deposits: [],
      isPrimary: goals.length === 0,
    };
    store.addGoal(goal);
    setGoals(store.getGoals());
    setCreating(false);
    fireConfetti();
    store.addXP(20);
  };

  const addDeposit = (goal: Goal) => {
    if (!depositAmount || Number(depositAmount) <= 0) return;
    const amount = Number(depositAmount);
    const updated = {
      savedAmount: goal.savedAmount + amount,
      deposits: [...goal.deposits, { date: new Date().toISOString(), amount }],
    };
    store.updateGoal(goal.id, updated);
    const newGoal = { ...goal, ...updated };
    setGoals(store.getGoals());
    setViewGoal(newGoal);
    setDepositAmount('');
    store.addXP(10);
    fireSmallConfetti();

    const pct = (newGoal.savedAmount / newGoal.targetAmount) * 100;
    if (pct >= 25) store.unlockAchievement('a5');
    if (pct >= 50) store.unlockAchievement('a6');
    if (pct >= 75) store.unlockAchievement('a7');
    if (pct >= 100) store.unlockAchievement('a8');
  };

  // Goal detail view
  if (viewGoal) {
    const g = goals.find(x => x.id === viewGoal.id) || viewGoal;
    const pct = Math.round((g.savedAmount / g.targetAmount) * 100);
    return (
      <div className="px-5 py-6 animate-fade-in">
        <button onClick={() => setViewGoal(null)} className="mb-4 flex items-center gap-1 text-label-large text-on-surface-variant">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex flex-col items-center mb-6">
          <ProgressRing progress={pct} size={180} strokeWidth={14}>
            <span className="text-4xl">{g.icon}</span>
            <span className="mt-1 text-headline-medium text-on-surface">{pct}%</span>
          </ProgressRing>
          <h2 className="mt-3 text-title-large text-on-surface">{g.name}</h2>
          <p className="text-title-small text-tertiary">${g.savedAmount.toLocaleString()} of ${g.targetAmount.toLocaleString()}</p>
        </div>

        {/* Add deposit */}
        <div className="mb-6 flex gap-2">
          <Input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Add savings..." className="flex-1" />
          <Button onClick={() => addDeposit(g)} disabled={!depositAmount} className="px-6">
            Save
          </Button>
        </div>

        {/* Milestones */}
        <div className="mb-6">
          <h3 className="mb-3 text-title-small text-on-surface">Milestones</h3>
          <div className="space-y-2">
            {[25, 50, 75, 100].map(m => (
              <div key={m} className={`flex items-center gap-3 rounded-2xl p-4 ${pct >= m ? 'bg-tertiary-container' : 'bg-surface-container-low'}`}>
                <span className="text-lg">{pct >= m ? '✅' : '⬜'}</span>
                <span className="text-body-medium text-on-surface">{m}% — ${Math.round(g.targetAmount * m / 100).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deposit history */}
        {g.deposits.length > 0 && (
          <div>
            <h3 className="mb-3 text-title-small text-on-surface">Deposit History</h3>
            <div className="space-y-2">
              {g.deposits.slice().reverse().map((d, i) => (
                <div key={i} className="flex justify-between rounded-2xl bg-surface-container-low p-4">
                  <span className="text-body-medium text-on-surface-variant">{new Date(d.date).toLocaleDateString()}</span>
                  <span className="text-label-large text-tertiary">+${d.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Create flow
  if (creating) {
    return (
      <div className="px-5 py-6 animate-fade-in">
        <button onClick={() => setCreating(false)} className="mb-4 flex items-center gap-1 text-label-large text-on-surface-variant">
          <ArrowLeft size={16} /> Cancel
        </button>
        <AnimatePresence mode="wait">
          {createStep === 0 && (
            <motion.div key="tpl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="mb-1 text-headline-small text-on-surface">New Goal</h2>
              <p className="mb-5 text-body-medium text-on-surface-variant">What are you saving for?</p>
              <div className="grid grid-cols-2 gap-3">
                {GOAL_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => handleTemplateSelect(t.id)}
                    className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all ${
                      selectedTemplate === t.id
                        ? 'bg-primary-container ring-2 ring-primary'
                        : 'bg-surface-container-low hover:bg-surface-container'
                    }`}>
                    <span className="text-3xl">{t.icon}</span>
                    <span className={`text-label-large ${selectedTemplate === t.id ? 'text-on-primary-container' : 'text-on-surface'}`}>{t.name}</span>
                  </button>
                ))}
              </div>
              <Button onClick={() => setCreateStep(1)} disabled={!selectedTemplate} className="mt-5 w-full">
                Continue <ArrowRight size={16} />
              </Button>
            </motion.div>
          )}
          {createStep === 1 && (
            <motion.div key="amt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="mb-4 text-center text-4xl">{template?.icon}</div>
              <h2 className="mb-5 text-headline-small text-on-surface text-center">Set your target</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-label-medium text-on-surface-variant">Name</label>
                  <Input value={goalName} onChange={e => setGoalName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-label-medium text-on-surface-variant">Amount ($)</label>
                  <Input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="text-xl font-bold" />
                </div>
                <div>
                  <label className="mb-1.5 block text-label-medium text-on-surface-variant">Deadline</label>
                  <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <Button variant="outline" onClick={() => setCreateStep(0)} size="icon"><ArrowLeft size={16} /></Button>
                <Button onClick={finishCreate} disabled={!targetAmount || !deadline} className="flex-1">
                  Create Goal 🎉
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Goals list
  return (
    <div className="px-5 py-6 animate-fade-in">
      <h1 className="mb-5 text-headline-small text-on-surface">Your Goals</h1>
      {goals.length === 0 ? (
        <div className="rounded-3xl bg-primary-container p-10 text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <p className="mb-1 text-title-large text-on-primary-container">No goals yet</p>
          <p className="mb-4 text-body-medium text-on-primary-container/70">Create your first savings goal to get started!</p>
          <Button onClick={startCreate} className="gap-2">
            <Plus size={16} /> Create Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(g => {
            const pct = Math.round((g.savedAmount / g.targetAmount) * 100);
            return (
              <button key={g.id} onClick={() => setViewGoal(g)} className="w-full rounded-2xl bg-surface-container-low p-4 text-left transition-all active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-title-small text-on-surface truncate">{g.name}</p>
                      {g.isPrimary && <span className="text-label-small bg-primary-container text-on-primary-container px-2.5 py-0.5 rounded-full">Primary</span>}
                    </div>
                    <p className="text-body-small text-on-surface-variant">${g.savedAmount.toLocaleString()} / ${g.targetAmount.toLocaleString()}</p>
                    <div className="mt-2 h-1 w-full rounded-full bg-surface-container">
                      <div className="h-1 rounded-full bg-tertiary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB */}
      {goals.length > 0 && (
        <button
          onClick={startCreate}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ maxWidth: 'calc((100vw - 430px) / 2 + 430px - 16px)' }}
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
