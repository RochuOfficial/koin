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

    // Check achievements
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
        <button onClick={() => setViewGoal(null)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex flex-col items-center mb-6">
          <ProgressRing progress={pct} size={180} strokeWidth={14}>
            <span className="text-4xl">{g.icon}</span>
            <span className="mt-1 text-2xl font-bold">{pct}%</span>
          </ProgressRing>
          <h2 className="mt-3 text-xl font-bold">{g.name}</h2>
          <p className="text-sm text-accent font-medium">${g.savedAmount.toLocaleString()} of ${g.targetAmount.toLocaleString()}</p>
        </div>

        {/* Add deposit */}
        <div className="mb-6 flex gap-2">
          <Input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Add savings..." className="rounded-xl h-12 flex-1" />
          <Button onClick={() => addDeposit(g)} disabled={!depositAmount} className="rounded-xl h-12 px-6 font-semibold">
            Save
          </Button>
        </div>

        {/* Milestones */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold">Milestones</h3>
          <div className="space-y-2">
            {[25, 50, 75, 100].map(m => (
              <div key={m} className={`flex items-center gap-3 rounded-xl p-3 ${pct >= m ? 'bg-accent/10' : 'bg-card border border-border'}`}>
                <span className="text-lg">{pct >= m ? '✅' : '⬜'}</span>
                <span className="text-sm font-medium">{m}% — ${Math.round(g.targetAmount * m / 100).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deposit history */}
        {g.deposits.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold">Deposit History</h3>
            <div className="space-y-2">
              {g.deposits.slice().reverse().map((d, i) => (
                <div key={i} className="flex justify-between rounded-xl border border-border bg-card p-3">
                  <span className="text-sm text-muted-foreground">{new Date(d.date).toLocaleDateString()}</span>
                  <span className="text-sm font-semibold text-accent">+${d.amount}</span>
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
        <button onClick={() => setCreating(false)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Cancel
        </button>
        <AnimatePresence mode="wait">
          {createStep === 0 && (
            <motion.div key="tpl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <h2 className="mb-1 text-2xl font-bold">New Goal</h2>
              <p className="mb-5 text-sm text-muted-foreground">What are you saving for?</p>
              <div className="grid grid-cols-2 gap-3">
                {GOAL_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => handleTemplateSelect(t.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${selectedTemplate === t.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                    <span className="text-3xl">{t.icon}</span>
                    <span className="text-sm font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
              <Button onClick={() => setCreateStep(1)} disabled={!selectedTemplate} className="mt-5 w-full rounded-xl h-12 font-semibold">
                Continue <ArrowRight size={16} />
              </Button>
            </motion.div>
          )}
          {createStep === 1 && (
            <motion.div key="amt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="mb-4 text-center text-4xl">{template?.icon}</div>
              <h2 className="mb-5 text-2xl font-bold text-center">Set your target</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Name</label>
                  <Input value={goalName} onChange={e => setGoalName(e.target.value)} className="rounded-xl h-12" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Amount ($)</label>
                  <Input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="rounded-xl h-12 text-xl font-bold" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">Deadline</label>
                  <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="rounded-xl h-12" />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <Button variant="outline" onClick={() => setCreateStep(0)} className="rounded-xl"><ArrowLeft size={16} /></Button>
                <Button onClick={finishCreate} disabled={!targetAmount || !deadline} className="flex-1 rounded-xl h-12 font-semibold">
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
      <h1 className="mb-5 text-2xl font-bold">Your Goals</h1>
      {goals.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 text-center">
          <div className="mb-3 text-4xl">🎯</div>
          <p className="mb-1 text-lg font-semibold">No goals yet</p>
          <p className="mb-4 text-sm text-muted-foreground">Create your first savings goal to get started!</p>
          <Button onClick={startCreate} className="rounded-xl gap-2">
            <Plus size={16} /> Create Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(g => {
            const pct = Math.round((g.savedAmount / g.targetAmount) * 100);
            return (
              <button key={g.id} onClick={() => setViewGoal(g)} className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:shadow-md active:scale-[0.98]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">{g.name}</p>
                      {g.isPrimary && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Primary</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">${g.savedAmount.toLocaleString()} / ${g.targetAmount.toLocaleString()}</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-border">
                      <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
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
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ maxWidth: 'calc((100vw - 430px) / 2 + 430px - 16px)' }}
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
