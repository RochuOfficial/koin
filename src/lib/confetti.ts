import confetti from 'canvas-confetti';

export function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#1D4ED8', '#3B82F6', '#10B981', '#34D399', '#D97706'],
  });
}

export function fireSmallConfetti() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: ['#10B981', '#34D399', '#A7F3D0'],
  });
}
