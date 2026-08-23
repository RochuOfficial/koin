import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '@/components/animation/BottomSheet';
import { PressableScale } from '@/components/animation/PressableScale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore, getCurrencySymbol, type Goal } from '@/lib/store';
import { getTodayString } from '@/lib/deposits';
import { X } from 'lucide-react-native';

interface Props {
  open: boolean;
  onClose: () => void;
  goals: Goal[];
  defaultGoalId?: string;
  onSaved?: () => void;
}

export function AddSavingsModal({ open, onClose, goals, defaultGoalId, onSaved }: Props) {
  const { t } = useTranslation('dashboard');
  const [amount, setAmount] = useState('');
  const [goalId, setGoalId] = useState(defaultGoalId);

  const updateGoal = useStore((state) => state.updateGoal);
  const addXP = useStore((state) => state.addXP);
  const unlockAchievement = useStore((state) => state.unlockAchievement);
  const currency = useStore((state) => state.profile.currency);
  const currencySymbol = getCurrencySymbol(currency);

  // The active/primary goal on the dashboard can change between opens (e.g.
  // the carousel scrolls) — resync the default each time the sheet opens
  // rather than only on mount.
  useEffect(() => {
    if (open) setGoalId(defaultGoalId);
  }, [open, defaultGoalId]);

  const goal = goals.find((g) => g.id === goalId);

  const handleSave = () => {
    if (!amount || Number(amount) <= 0 || !goal) return;
    const depositAmount = Number(amount);
    const updates = {
      savedAmount: goal.savedAmount + depositAmount,
      deposits: [...goal.deposits, { date: getTodayString(), amount: depositAmount }],
    };
    updateGoal(goal.id, updates);
    addXP(10);
    const pct = ((goal.savedAmount + depositAmount) / goal.targetAmount) * 100;
    if (pct >= 25) unlockAchievement('a5');
    if (pct >= 50) unlockAchievement('a6');
    if (pct >= 75) unlockAchievement('a7');
    if (pct >= 100) unlockAchievement('a8');
    setAmount('');
    onSaved?.();
    onClose();
  };

  return (
    <BottomSheet visible={open} onClose={onClose}>
      <View className="p-6 pt-2">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-on-surface">{t('addSavings.title')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={6} className="p-2 bg-surface-container-low rounded-full">
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView className="space-y-4" keyboardShouldPersistTaps="handled">
          <View className="mb-4">
            <Text className="mb-2 text-sm text-on-surface-variant font-medium">{t('addSavings.amountLabel', { symbol: currencySymbol })}</Text>
            <Input
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder={t('addSavings.amountPlaceholder')}
              className="text-xl font-bold bg-surface-container-low"
              autoFocus
            />
          </View>
          {goals.length > 1 && (
            <View className="mb-6">
              <Text className="mb-2 text-sm text-on-surface-variant font-medium">{t('addSavings.goalLabel')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {goals.map((g) => (
                  <PressableScale key={g.id} onPress={() => setGoalId(g.id)}>
                    <View
                      className={`flex-row items-center gap-2 px-4 py-3 rounded-2xl ${
                        goalId === g.id
                          ? 'bg-primary-container border-2 border-primary'
                          : 'bg-surface-container-low'
                      }`}
                    >
                      <Text className="text-lg">{g.icon}</Text>
                      <Text
                        className={`text-sm ${goalId === g.id ? 'text-on-primary-container font-bold' : 'text-on-surface-variant'}`}
                        numberOfLines={1}
                      >
                        {g.name}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>
            </View>
          )}
          <Button
            onPress={handleSave}
            disabled={!amount || !goal}
            className="w-full mb-8"
            label={t('addSavings.save')}
          />
        </ScrollView>
      </View>
    </BottomSheet>
  );
}
