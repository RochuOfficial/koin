import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Trophy, Check } from 'lucide-react';
import { store, Mission, Achievement } from '@/lib/store';
import { fireSmallConfetti } from '@/lib/confetti';

export default function Missions() {
  const [missions, setMissions] = useState(store.getMissions());
  const [achievements, setAchievements] = useState(store.getAchievements());
  const profile = store.getProfile();
  const [tab, setTab] = useState<'missions' | 'achievements'>('missions');

  const completeMission = (m: Mission) => {
    store.completeMission(m.id);
    store.addXP(m.reward);
    setMissions(store.getMissions());
    fireSmallConfetti();

    const completed = store.getMissions().filter(x => x.completed).length;
    if (completed >= 5) store.unlockAchievement('a4');
    setAchievements(store.getAchievements());
  };

  const dailyMissions = missions.filter(m => m.type === 'daily');
  const weeklyMissions = missions.filter(m => m.type === 'weekly');
  const completedCount = missions.filter(m => m.completed).length;

  return (
    <div className="px-5 py-6 animate-fade-in">
      <h1 className="mb-1 text-2xl font-bold">Missions</h1>
      <p className="mb-5 text-sm text-muted-foreground">Complete missions to earn XP and build habits</p>

      {/* Level bar */}
      <div className="mb-5 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <span className="text-sm font-semibold">Saver Lv.{profile.level}</span>
          </div>
          <span className="text-xs text-muted-foreground">{profile.xp % 100}/100 XP</span>
        </div>
        <div className="h-2 w-full rounded-full bg-border">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${profile.xp % 100}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{completedCount}/{missions.length} missions completed</p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setTab('missions')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${tab === 'missions' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}
        >
          Missions
        </button>
        <button
          onClick={() => setTab('achievements')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${tab === 'achievements' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}
        >
          <Trophy size={14} className="inline mr-1" /> Badges
        </button>
      </div>

      {tab === 'missions' ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Daily Missions</h3>
          <div className="mb-5 space-y-2">
            {dailyMissions.map(m => (
              <MissionCard key={m.id} mission={m} onComplete={() => completeMission(m)} />
            ))}
          </div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Weekly Missions</h3>
          <div className="space-y-2">
            {weeklyMissions.map(m => (
              <MissionCard key={m.id} mission={m} onComplete={() => completeMission(m)} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {achievements.map(a => (
            <motion.div
              key={a.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center ${a.unlocked ? 'bg-accent/10 border border-accent/30' : 'bg-card border border-border opacity-50'}`}
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-[11px] font-semibold leading-tight">{a.title}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{a.description}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function MissionCard({ mission, onComplete }: { mission: Mission; onComplete: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${mission.completed ? 'border-accent/30 bg-accent/5' : 'border-border bg-card'}`}>
      <button
        onClick={onComplete}
        disabled={mission.completed}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          mission.completed ? 'border-accent bg-accent text-accent-foreground' : 'border-border hover:border-primary'
        }`}
      >
        {mission.completed && <Check size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${mission.completed ? 'line-through text-muted-foreground' : ''}`}>{mission.title}</p>
        <p className="text-[11px] text-muted-foreground">{mission.description}</p>
      </div>
      <span className="text-xs font-bold text-primary">+{mission.reward} XP</span>
    </div>
  );
}
