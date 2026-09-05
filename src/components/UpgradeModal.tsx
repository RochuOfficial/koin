/**
 * "Upgrade your plan" popup — the non-destructive gate for blocked features.
 *
 * Constraint C13: gated features are never hidden; when a user hits a quota or a
 * feature they don't have, the feature stays visible and this popup appears with
 * a clear reason and a path to upgrade. Styling mirrors CalendarModal.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from './animation/BottomSheet';
import { Button } from './ui/button';
import { getPlanConfig, type GateInfo } from '@/lib/entitlements';

interface UpgradeModalProps {
  isVisible: boolean;
  gate: GateInfo | null;
  onClose: () => void;
  /** Called with the suggested plan when the user chooses to see plan details. */
  onViewPlans: (targetPlan: NonNullable<GateInfo['requiredPlan']>) => void;
  /** Optional lower-emphasis action rendered below the main CTA. */
  secondaryAction?: { label: string; onPress: () => void };
}

export function UpgradeModal({
  isVisible,
  gate,
  onClose,
  onViewPlans,
  secondaryAction,
}: UpgradeModalProps) {
  const { t } = useTranslation('plans');
  const requiredPlan = gate?.requiredPlan ?? null;
  const targetConfig = requiredPlan ? getPlanConfig(requiredPlan) : null;

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  const handleViewPlans = () => {
    if (!requiredPlan) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onViewPlans(requiredPlan);
  };

  const handleSecondary = () => {
    if (!secondaryAction) return;
    Haptics.selectionAsync();
    secondaryAction.onPress();
  };

  return (
    <BottomSheet visible={isVisible} onClose={handleClose}>
      <View className="px-5 pt-2">
        <View className="items-end">
          <Pressable
            onPress={handleClose}
            hitSlop={6}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-container"
            accessibilityRole="button"
            accessibilityLabel={t('common:a11y.close')}
          >
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        <View className="items-center -mt-2 mb-4">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary-container mb-4">
            <Sparkles size={28} color="#1D4ED8" />
          </View>
          <Text className="text-xl font-black text-on-surface text-center">
            {gate?.title ?? t('upgradeModal.defaultTitle')}
          </Text>
          <Text className="mt-2 text-sm font-medium text-on-surface-variant text-center px-2">
            {gate?.description ?? t('upgradeModal.defaultDescription')}
          </Text>
        </View>

        {/* No price here (#173): the app shows no prices and offers no purchase
            path, so this names the tier and sends the user to the read-only
            plan detail rather than to a checkout. */}
        {targetConfig && (
          <View className="mb-5 rounded-2xl bg-surface-container-low p-4">
            <Text className="text-xs font-semibold text-on-surface-variant">
              {t('upgradeModal.recommendedPlan')}
            </Text>
            <Text className="text-base font-black text-on-surface mt-0.5">
              {targetConfig.displayName}
            </Text>
          </View>
        )}

        {requiredPlan ? (
          <Button onPress={handleViewPlans} label={t('upgradeModal.seePlanDetails')} className="w-full" />
        ) : (
          <Button onPress={handleClose} label={t('upgradeModal.onTopPlan')} disabled className="w-full" />
        )}

        {secondaryAction && (
          <Button
            onPress={handleSecondary}
            label={secondaryAction.label}
            variant="outline"
            className="w-full mt-3"
          />
        )}

        <Pressable onPress={handleClose} className="mt-3 mb-2 items-center py-2">
          <Text className="text-sm font-semibold text-on-surface-variant">{t('upgradeModal.maybeLater')}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
