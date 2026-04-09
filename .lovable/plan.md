
# SaveQuest — Personal Finance Goal App

## Overview
A mobile-first personal finance app that makes saving money feel like a rewarding game. Users create savings goals, build daily habits, track streaks, and get AI coaching — all in a clean, trustworthy fintech UI.

## Design System
- Primary blue (#1D4ED8), secondary (#3B82F6), progress green (#10B981), amber warnings (#D97706)
- Light mode only, strong whitespace, rounded cards, soft shadows
- Mobile-first layout (max-width container), bottom tab navigation

## Pages & Navigation
Bottom nav with 5 tabs: **Home**, **Goals**, **Missions**, **AI Coach**, **Profile**

### 1. Onboarding Flow (5 steps)
- **Step 1**: Welcome screen → "Start your first goal" CTA
- **Step 2**: Goal template picker (holiday, concert, car, education, etc.) with icons
- **Step 3**: Set target amount + deadline → instant projected completion
- **Step 4**: Set monthly income + add expenses manually
- **Step 5**: Short AI financial personality quiz (3 questions) → personality result card

### 2. Home / Dashboard
- Greeting + savings streak badge (fire icon + day count)
- Primary goal progress ring (large, centered)
- Projected completion date
- Today's spending snapshot (simple number)
- Quick "Add Expense" button
- Weekly streak visualization (7 dots)
- Motivational copy ("You're 68% to your holiday fund!")

### 3. Goals Page
- List of active goals as cards with progress bars
- Floating "+" button to create new goal
- Goal detail view: progress ring, timeline, milestones, deposit history
- Goal creation flow: template → amount → deadline → confirmation with celebration animation

### 4. Habits / Missions
- Daily/weekly saving missions (e.g., "Skip coffee today", "Save $5")
- Streak tracker with milestone celebrations
- Achievement badges grid (unlocked/locked states)
- Level progress bar (Saver Lv.1 → Lv.10)
- Mission completion with reward animation (confetti)

### 5. AI Coach
- Mock chat UI with pre-scripted responses
- Supportive financial coach personality
- Conversation starters: "How can I save more?", "Am I on track?", "Help me recover this week"
- Markdown-rendered responses, encouraging tone

### 6. Profile / Settings
- User info, monthly income summary
- Expense categories overview
- Notification preferences (payday reminder, streak protection, milestone alerts)
- App settings

## Key Interactions
- Goal creation is the dominant CTA everywhere (dashboard, goals page, empty states)
- Adding expenses via quick-add modal (amount + category)
- Completing missions triggers celebration animations
- Off-track states use amber with "small detour" language, never red

## State Management
- All data stored in React state/localStorage (no backend)
- Onboarding completion flag persisted
- Goals, expenses, missions, streaks stored locally

## Components to Build
- Bottom tab navigation bar
- Onboarding stepper with progress dots
- Goal template cards with icons
- Progress ring component
- Streak tracker (fire + dots)
- Mission cards with completion states
- Achievement badge grid
- Quick expense modal
- Mock AI chat interface
- Celebration/confetti animation
- Notification/nudge cards
