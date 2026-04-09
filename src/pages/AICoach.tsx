import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { store } from '@/lib/store';

interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
}

const STARTERS = [
  'How can I save more?',
  'Am I on track?',
  'Help me recover this week',
  'What should I do next?',
];

function getCoachResponse(input: string): string {
  const lower = input.toLowerCase();
  const profile = store.getProfile();
  const goals = store.getGoals();
  const primaryGoal = goals.find(g => g.isPrimary) || goals[0];

  if (lower.includes('save more')) {
    return `Great question! 💡 Here are some practical tips:\n\n1. **Try the 50/30/20 rule** — allocate 20% of your income to savings\n2. **Automate small amounts** — even $5/day adds up to $150/month\n3. **Do a subscription audit** — cancel what you don't use\n4. **Try a no-spend day** once a week\n\nYou're already building great habits. Keep going! 🌱`;
  }
  if (lower.includes('on track')) {
    if (primaryGoal) {
      const pct = Math.round((primaryGoal.savedAmount / primaryGoal.targetAmount) * 100);
      if (pct >= 50) return `You're doing amazing! 🚀 You've saved **${pct}%** of your ${primaryGoal.name} goal. At this pace, you're well ahead. Keep the momentum going!`;
      if (pct >= 20) return `You're making solid progress! 💪 **${pct}%** saved toward your ${primaryGoal.name}. Stay consistent and you'll get there. Every deposit counts!`;
      return `You're getting started on your ${primaryGoal.name} journey — **${pct}%** saved so far. Remember, the hardest part is starting, and you've already done that! 🌱`;
    }
    return "I'd love to help you track your progress! Try creating a savings goal first, and I can give you personalized guidance. 🎯";
  }
  if (lower.includes('recover') || lower.includes('off track') || lower.includes('detour')) {
    return `No worries at all! 🤗 A small detour doesn't define your journey.\n\nHere's what I suggest:\n1. **Don't stress** — one off week is totally normal\n2. **Start small** — save just $5 today to rebuild momentum\n3. **Review your expenses** — find one small cut this week\n4. **Adjust, don't abandon** — your goal is still very much achievable\n\nYou've got this! Tomorrow is a fresh start. 💙`;
  }
  if (lower.includes('next') || lower.includes('should')) {
    const tips = [
      `Complete today's saving mission to earn XP and keep your streak alive! 🔥`,
      `Try adding a small deposit to your ${primaryGoal?.name || 'savings'} goal — even $10 makes progress.`,
      `Review your spending from this week. Small awareness leads to big changes.`,
    ];
    return tips[Math.floor(Math.random() * tips.length)] + `\n\nYour current streak is **${profile.streak} days**. Let's keep it going!`;
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hey there! 👋 I'm your Koin coach. I'm here to help you save smarter and stay motivated.\n\nWhat would you like to know? I can help with saving tips, tracking progress, or getting back on track.`;
  }
  return `That's a great point! 💙 Here's my advice:\n\n• **Stay consistent** — small daily actions beat big occasional efforts\n• **Celebrate progress** — you're Lv.${profile.level} already!\n• **Be kind to yourself** — financial growth is a journey, not a sprint\n\nWant me to help with something specific? Try asking about saving tips or your progress! 😊`;
}

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'coach',
      content: "Hi! 👋 I'm your Koin coach. I'm here to help you save smarter and reach your goals. What's on your mind today?",
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (text: string) => {
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const coachMsg: Message = { id: crypto.randomUUID(), role: 'coach', content: getCoachResponse(text) };
      setMessages(prev => [...prev, coachMsg]);
    }, 600);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* Header */}
      <div className="bg-surface-container-low px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h1 className="text-title-medium text-on-surface">AI Coach</h1>
            <p className="text-label-small text-tertiary">Online • Ready to help</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-body-medium leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary-container text-on-primary-container rounded-br-lg'
                : 'bg-surface-container-low text-on-surface rounded-bl-lg'
            }`}>
              {m.content.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-1' : ''}>
                  {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={j}>{part.slice(2, -2)}</strong>
                      : part
                  )}
                </p>
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Starters */}
      {messages.length <= 1 && (
        <div className="px-5 pb-2 flex flex-wrap gap-2">
          {STARTERS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-outline bg-transparent px-4 py-2 text-label-large text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-surface-container-low p-3">
        <form onSubmit={e => { e.preventDefault(); if (input.trim()) send(input.trim()); }} className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your coach..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} className="shrink-0">
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
