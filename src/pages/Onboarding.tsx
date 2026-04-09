import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { store, GOAL_TEMPLATES, Goal } from '@/lib/store';
import { fireConfetti } from '@/lib/confetti';
import { ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react';

const QUIZ_QUESTIONS = [
  {
    question: 'When you get extra money, what do you usually do?',
    options: ['Spend it right away', 'Save some, spend some', 'Save most of it', 'Invest it'],
  },
  {
    question: 'How do you feel about budgeting?',
    options: ['I avoid it', 'I try but forget', 'I do it loosely', 'I track everything'],
  },
  {
    question: 'What motivates you to save?',
    options: ['A specific dream', 'Security & peace', 'Building wealth', 'Competing with myself'],
  },
];

const PERSONALITY_TYPES: Record<string, { title: string; emoji: string; desc: string }> = {
  dreamer: { title: 'The Dreamer', emoji: '✨', desc: 'You save best when you have a vivid goal to chase. Dream big!' },
  builder: { title: 'The Builder', emoji: '🏗️', desc: 'You like structure and steady progress. One brick at a time!' },
  challenger: { title: 'The Challenger', emoji: '⚡', desc: 'You thrive on competition and beating your own records!' },
  guardian: { title: 'The Guardian', emoji: '🛡️', desc: 'Security drives you. You value stability and peace of mind.' },
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [income, setIncome] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [personalityResult, setPersonalityResult] = useState('');

  const template = GOAL_TEMPLATES.find(t => t.id === selectedTemplate);

  const handleTemplateSelect = (id: string) => {
    const t = GOAL_TEMPLATES.find(t => t.id === id)!;
    setSelectedTemplate(id);
    setGoalName(t.name);
    setTargetAmount(String(t.suggestedAmount));
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setDeadline(d.toISOString().split('T')[0]);
  };

  const handleQuizAnswer = (idx: number) => {
    const newAnswers = [...quizAnswers, idx];
    setQuizAnswers(newAnswers);
    if (currentQuiz < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuiz(currentQuiz + 1);
    } else {
      const avg = newAnswers.reduce((a, b) => a + b, 0) / newAnswers.length;
      const type = avg < 1 ? 'dreamer' : avg < 2 ? 'builder' : avg < 3 ? 'challenger' : 'guardian';
      setPersonalityResult(type);
      store.updateProfile({ personalityType: type });
      store.unlockAchievement('a12');
    }
  };

  const finishOnboarding = () => {
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
      isPrimary: true,
    };
    store.addGoal(goal);
    store.updateProfile({
      monthlyIncome: Number(income),
      onboardingCompleted: true,
    });
    store.unlockAchievement('a1');
    fireConfetti();
    setTimeout(() => navigate('/home'), 600);
  };

  const projectedMonths = targetAmount && income
    ? Math.ceil(Number(targetAmount) / (Number(income) * 0.2))
    : null;

  const steps = [
    // Step 0: Welcome
    <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center justify-center px-6 text-center min-h-[70vh]">
      <div className="mb-6 text-6xl">💰</div>
      <h1 className="mb-3 text-3xl font-bold text-foreground">Welcome to SaveQuest</h1>
      <p className="mb-2 text-lg text-muted-foreground">Your journey to financial freedom starts with one goal.</p>
      <p className="mb-8 text-sm text-muted-foreground">Let's set up your first savings goal in 60 seconds.</p>
      <Button onClick={() => setStep(1)} size="lg" className="w-full max-w-xs gap-2 text-base font-semibold rounded-xl h-14">
        Start your first goal <ArrowRight size={18} />
      </Button>
    </motion.div>,

    // Step 1: Template picker
    <motion.div key="template" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-5 py-6">
      <h2 className="mb-1 text-2xl font-bold">What are you saving for?</h2>
      <p className="mb-6 text-sm text-muted-foreground">Pick a goal that excites you</p>
      <div className="grid grid-cols-2 gap-3">
        {GOAL_TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => handleTemplateSelect(t.id)}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
              selectedTemplate === t.id
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <span className="text-3xl">{t.icon}</span>
            <span className="text-sm font-medium">{t.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => setStep(0)} className="rounded-xl"><ArrowLeft size={16} /></Button>
        <Button onClick={() => setStep(2)} disabled={!selectedTemplate} className="flex-1 rounded-xl h-12 font-semibold">
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    // Step 2: Amount & deadline
    <motion.div key="amount" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-5 py-6">
      <div className="mb-4 text-center text-4xl">{template?.icon}</div>
      <h2 className="mb-1 text-2xl font-bold text-center">Set your {goalName} goal</h2>
      <p className="mb-6 text-sm text-muted-foreground text-center">How much do you need?</p>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Goal name</label>
          <Input value={goalName} onChange={e => setGoalName(e.target.value)} className="rounded-xl h-12 text-base" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Target amount ($)</label>
          <Input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="rounded-xl h-12 text-base text-2xl font-bold" placeholder="0" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Target date</label>
          <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="rounded-xl h-12 text-base" />
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl"><ArrowLeft size={16} /></Button>
        <Button onClick={() => setStep(3)} disabled={!targetAmount || !deadline} className="flex-1 rounded-xl h-12 font-semibold">
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    // Step 3: Income
    <motion.div key="income" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-5 py-6">
      <h2 className="mb-1 text-2xl font-bold">What's your monthly income?</h2>
      <p className="mb-6 text-sm text-muted-foreground">This helps us plan your savings journey</p>
      <Input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="e.g. 3000" className="rounded-xl h-14 text-2xl font-bold mb-4" />
      {projectedMonths && Number(income) > 0 && (
        <div className="rounded-xl bg-progress/10 p-4 text-center">
          <p className="text-sm text-muted-foreground">Saving 20% monthly, you'll reach your goal in</p>
          <p className="mt-1 text-2xl font-bold text-accent">{projectedMonths} months</p>
          <p className="mt-1 text-xs text-muted-foreground">(${Math.round(Number(income) * 0.2)}/month toward your goal)</p>
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl"><ArrowLeft size={16} /></Button>
        <Button onClick={() => setStep(4)} disabled={!income} className="flex-1 rounded-xl h-12 font-semibold">
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    // Step 4: Quiz
    <motion.div key="quiz" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-5 py-6">
      {!personalityResult ? (
        <>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            <h2 className="text-2xl font-bold">Quick money quiz</h2>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">Question {currentQuiz + 1} of {QUIZ_QUESTIONS.length}</p>
          <div className="mb-4 flex gap-1">
            {QUIZ_QUESTIONS.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= currentQuiz ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>
          <p className="mb-6 text-lg font-medium">{QUIZ_QUESTIONS[currentQuiz].question}</p>
          <div className="space-y-3">
            {QUIZ_QUESTIONS[currentQuiz].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleQuizAnswer(i)}
                className="w-full rounded-xl border-2 border-border bg-card p-4 text-left text-sm font-medium transition-all hover:border-primary/40 active:scale-[0.98]"
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-center pt-8">
          <div className="mb-4 text-6xl">{PERSONALITY_TYPES[personalityResult].emoji}</div>
          <h2 className="mb-2 text-2xl font-bold">{PERSONALITY_TYPES[personalityResult].title}</h2>
          <p className="mb-8 text-muted-foreground">{PERSONALITY_TYPES[personalityResult].desc}</p>
          <div className="w-full rounded-xl bg-progress/10 p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-accent">
              <Check size={18} />
              <span className="text-sm font-semibold">Achievement unlocked: Smart Saver 🧠</span>
            </div>
          </div>
          <Button onClick={finishOnboarding} size="lg" className="w-full max-w-xs gap-2 rounded-xl h-14 text-base font-semibold">
            Let's go! <ArrowRight size={18} />
          </Button>
        </div>
      )}
    </motion.div>,
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-background">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-2">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step ? 'w-6 bg-primary' : i < step ? 'w-2 bg-primary/40' : 'w-2 bg-border'
            }`}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
    </div>
  );
}
