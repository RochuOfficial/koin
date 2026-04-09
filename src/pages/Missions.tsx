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
      <h1 className="mb-1 text-headline-small text-on-surface">Missions</h1>
      <p className="mb-5 text-body-medium text-on-surface-variant">Complete missions to earn XP and build habits</p>

      {/* Level bar */}
      <div className="mb-5 rounded-2xl bg-surface-container-low p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <span className="text-title-small text-on-surface">Saver Lv.{profile.level}</span>
          </div>
          <span className="text-label-medium text-on-surface-variant">{profile.xp % 100}/100 XP</span>
        </div>
        <div className="h-1 w-full rounded-full bg-surface-container">
          <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${profile.xp % 100}%` }} />
        </div>
        <p className="mt-2 text-label-small text-on-surface-variant">{completedCount}/{missions.length} missions completed</p>
      </div>

      {/* M3 Segmented Button */}
      <div className="mb-5 flex rounded-full bg-surface-container-low p-1">
        <button
          onClick={() => setTab('missions')}
          className={`flex-1 rounded-full py-2.5 text-label-large transition-all ${
            tab === 'missions'
              ? 'bg-primary text-primary-foreground'
              : 'text-on-surface-variant'
          }`}
        >
          Missions
        </button>
        <button
          onClick={() => setTab('achievements')}
          className={`flex-1 rounded-full py-2.5 text-label-large transition-all flex items-center justify-center gap-1 ${
            tab === 'achievements'
              ? 'bg-primary text-primary-foreground'
              : 'text-on-surface-variant'
          }`}
        >
          <Trophy size={14} /> Badges
        </button>
      </div>

      {tab === 'missions' ? (
        <div>
          <h3 className="mb-3 text-label-large text-on-surface-variant">Daily Missions</h3>
          <div className="mb-5 space-y-2">
            {dailyMissions.map(m => (
              <MissionCard key={m.id} mission={m} onComplete={() => completeMission(m)} />
            ))}
          </div>
          <h3 className="mb-3 text-label-large text-on-surface-variant">Weekly Missions</h3>
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
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center ${
                a.unlocked
                  ? 'bg-tertiary-container'
                  : 'bg-surface-container-low opacity-50'
              }`}
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-label-small text-on-surface leading-tight">{a.title}</span>
              <span className="text-[9px] text-on-surface-variant leading-tight">{a.description}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function MissionCard({ mission, onComplete }: { mission: Mission; onComplete: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-4 min-h-[56px] transition-all ${
      mission.completed ? 'bg-tertiary-container' : 'bg-surface-container-low'
    }`}>
      <button
        onClick={onComplete}
        disabled={mission.completed}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          mission.completed
            ? 'border-tertiary bg-tertiary text-tertiary-foreground'
            : 'border-outline hover:border-primary'
        }`}
      >
        {mission.completed && <Check size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-body-medium ${mission.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{mission.title}</p>
        <p className="text-label-small text-on-surface-variant">{mission.description}</p>
      </div>
      <span className="text-label-large text-primary">+{mission.reward} XP</span>
    </div>
  );
}
