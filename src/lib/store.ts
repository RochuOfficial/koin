// Simple localStorage-based state management

export interface Goal {
  id: string;
  template: string;
  icon: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline: string;
  createdAt: string;
  deposits: { date: string; amount: number }[];
  isPrimary: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  reward: number;
  completed: boolean;
  completedAt?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface UserProfile {
  name: string;
  monthlyIncome: number;
  personalityType?: string;
  level: number;
  xp: number;
  streak: number;
  lastActiveDate: string;
  onboardingCompleted: boolean;
  expenses: Expense[];
  notificationPrefs: {
    paydayReminder: boolean;
    streakProtection: boolean;
    milestoneAlerts: boolean;
    weeklyReflection: boolean;
  };
}

const KEYS = {
  profile: 'sq_profile',
  goals: 'sq_goals',
  missions: 'sq_missions',
  achievements: 'sq_achievements',
};

function get<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  monthlyIncome: 0,
  level: 1,
  xp: 0,
  streak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  onboardingCompleted: false,
  expenses: [],
  notificationPrefs: {
    paydayReminder: true,
    streakProtection: true,
    milestoneAlerts: true,
    weeklyReflection: true,
  },
};

const DEFAULT_MISSIONS: Mission[] = [
  { id: 'm1', title: 'Skip a coffee', description: 'Save by making coffee at home', type: 'daily', reward: 5, completed: false },
  { id: 'm2', title: 'No-spend lunch', description: 'Pack lunch instead of buying', type: 'daily', reward: 10, completed: false },
  { id: 'm3', title: 'Save $5 today', description: 'Move $5 to your goal', type: 'daily', reward: 5, completed: false },
  { id: 'm4', title: 'Walk instead of ride', description: 'Save on transport', type: 'daily', reward: 3, completed: false },
  { id: 'm5', title: 'Weekly savings boost', description: 'Save an extra $20 this week', type: 'weekly', reward: 20, completed: false },
  { id: 'm6', title: 'Cancel a subscription', description: 'Review and cancel one unused subscription', type: 'weekly', reward: 15, completed: false },
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'First Step', description: 'Create your first savings goal', icon: '🎯', unlocked: false },
  { id: 'a2', title: 'Streak Starter', description: 'Save 3 days in a row', icon: '🔥', unlocked: false },
  { id: 'a3', title: 'Week Warrior', description: 'Complete a 7-day streak', icon: '⚡', unlocked: false },
  { id: 'a4', title: 'Mission Master', description: 'Complete 5 missions', icon: '🏆', unlocked: false },
  { id: 'a5', title: 'Quarter Way', description: 'Reach 25% of a goal', icon: '🌱', unlocked: false },
  { id: 'a6', title: 'Halfway Hero', description: 'Reach 50% of a goal', icon: '💪', unlocked: false },
  { id: 'a7', title: 'Almost There', description: 'Reach 75% of a goal', icon: '🚀', unlocked: false },
  { id: 'a8', title: 'Goal Crusher', description: 'Complete a savings goal', icon: '👑', unlocked: false },
  { id: 'a9', title: 'Budget Boss', description: 'Track expenses for 7 days', icon: '📊', unlocked: false },
  { id: 'a10', title: 'Level Up', description: 'Reach Saver Level 3', icon: '⭐', unlocked: false },
  { id: 'a11', title: 'Consistency King', description: '30-day streak', icon: '💎', unlocked: false },
  { id: 'a12', title: 'Smart Saver', description: 'Complete the AI personality quiz', icon: '🧠', unlocked: false },
];

export const store = {
  getProfile: () => get<UserProfile>(KEYS.profile, DEFAULT_PROFILE),
  setProfile: (p: UserProfile) => set(KEYS.profile, p),
  updateProfile: (updates: Partial<UserProfile>) => {
    const p = store.getProfile();
    store.setProfile({ ...p, ...updates });
  },

  getGoals: () => get<Goal[]>(KEYS.goals, []),
  setGoals: (g: Goal[]) => set(KEYS.goals, g),
  addGoal: (g: Goal) => {
    const goals = store.getGoals();
    if (goals.length === 0) g.isPrimary = true;
    store.setGoals([...goals, g]);
  },
  updateGoal: (id: string, updates: Partial<Goal>) => {
    const goals = store.getGoals().map(g => g.id === id ? { ...g, ...updates } : g);
    store.setGoals(goals);
  },

  getMissions: () => get<Mission[]>(KEYS.missions, DEFAULT_MISSIONS),
  setMissions: (m: Mission[]) => set(KEYS.missions, m),
  completeMission: (id: string) => {
    const missions = store.getMissions().map(m =>
      m.id === id ? { ...m, completed: true, completedAt: new Date().toISOString() } : m
    );
    store.setMissions(missions);
  },

  getAchievements: () => get<Achievement[]>(KEYS.achievements, DEFAULT_ACHIEVEMENTS),
  setAchievements: (a: Achievement[]) => set(KEYS.achievements, a),
  unlockAchievement: (id: string) => {
    const achievements = store.getAchievements().map(a =>
      a.id === id ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
    );
    store.setAchievements(achievements);
  },

  addExpense: (expense: Expense) => {
    const p = store.getProfile();
    p.expenses = [...p.expenses, expense];
    store.setProfile(p);
  },

  getTodaySpending: () => {
    const today = new Date().toISOString().split('T')[0];
    const p = store.getProfile();
    return p.expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
  },

  addXP: (amount: number) => {
    const p = store.getProfile();
    p.xp += amount;
    const newLevel = Math.floor(p.xp / 100) + 1;
    if (newLevel > p.level) p.level = newLevel;
    store.setProfile(p);
  },

  resetForDemo: () => {
    localStorage.removeItem(KEYS.profile);
    localStorage.removeItem(KEYS.goals);
    localStorage.removeItem(KEYS.missions);
    localStorage.removeItem(KEYS.achievements);
  },
};

export const GOAL_TEMPLATES = [
  { id: 'holiday', name: 'Holiday', icon: '✈️', suggestedAmount: 2000 },
  { id: 'concert', name: 'Concert', icon: '🎵', suggestedAmount: 300 },
  { id: 'car', name: 'Car', icon: '🚗', suggestedAmount: 15000 },
  { id: 'emergency', name: 'Emergency Fund', icon: '🛡️', suggestedAmount: 5000 },
  { id: 'laptop', name: 'Laptop', icon: '💻', suggestedAmount: 1500 },
  { id: 'education', name: 'Education', icon: '📚', suggestedAmount: 10000 },
  { id: 'apartment', name: 'Apartment', icon: '🏠', suggestedAmount: 20000 },
  { id: 'wedding', name: 'Wedding', icon: '💍', suggestedAmount: 25000 },
  { id: 'trip', name: 'First Trip', icon: '🌍', suggestedAmount: 1000 },
  { id: 'purchase', name: 'Big Purchase', icon: '🎁', suggestedAmount: 500 },
];

export const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food & Drinks', icon: '🍔' },
  { id: 'transport', name: 'Transport', icon: '🚌' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'bills', name: 'Bills', icon: '📄' },
  { id: 'health', name: 'Health', icon: '💊' },
  { id: 'education', name: 'Education', icon: '📖' },
  { id: 'other', name: 'Other', icon: '📌' },
];
