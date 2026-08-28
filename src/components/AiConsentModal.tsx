/**
 * Explicit-permission gate before the first Coach message or Deep Analysis
 * request reaches a third-party AI provider (App Review Guideline 5.1.2(i),
 * added Nov 2025 — see implementations/APP_REVIEW_BLOCKERS.md Phase 2).
 *
 * One modal, one consent flag (store.ts's `profile.aiConsent`) covering both
 * AI surfaces — the copy names both, so a single "Allow" stays truthful
 * regardless of which surface asked. Styling mirrors
 * DeepAnalysisConfirmModal/UpgradeModal. "Not now" is a real, equal-weight
 * decline (not a single acknowledgement button) and leaves the rest of the
 * app fully usable — callers must not consume quota or send anything when
 * the user declines.
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from './animation/BottomSheet';
import { Button } from './ui/button';
import { safeOpenURL, AI_TRANSPARENCY_URL } from '@/lib/linking';

interface AiConsentModalProps {
  isVisible: boolean;
  onAllow: () => void;
  onDecline: () => void;
}

export function AiConsentModal({ isVisible, onAllow, onDecline }: AiConsentModalProps) {
  const { t } = useTranslation('common');

  const handleDecline = () => {
    Haptics.selectionAsync();
    onDecline();
  };

  const handleAllow = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAllow();
  };

  const handleLearnMore = () => {
    Haptics.selectionAsync();
    safeOpenURL(AI_TRANSPARENCY_URL, t('aiConsent.learnMoreError'), t('notAvailable'));
  };

  return (
    <BottomSheet visible={isVisible} onClose={handleDecline}>
      <View className="px-5 pt-2">
        <View className="items-end">
          <Pressable
            onPress={handleDecline}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('aiConsent.notNow')}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-container"
          >
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        <View className="items-center -mt-2 mb-4">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary-container mb-4">
            <Sparkles size={28} color="#1D4ED8" />
          </View>
          <Text className="text-xl font-black text-on-surface text-center">
            {t('aiConsent.title')}
          </Text>
          <Text className="mt-2 text-sm font-medium text-on-surface-variant text-center px-2">
            {t('aiConsent.intro')}
          </Text>
        </View>

        <View className="mb-4 gap-2.5 rounded-2xl bg-surface-container-low p-4">
          <Text className="text-[13px] leading-5 font-medium text-on-surface-variant">
            {t('aiConsent.dataShared')}
          </Text>
          <View className="h-px bg-outline/10" />
          <Text className="text-[13px] leading-5 font-medium text-on-surface-variant">
            {t('aiConsent.providers')}
          </Text>
          <View className="h-px bg-outline/10" />
          <Text className="text-[13px] leading-5 font-medium text-on-surface-variant">
            {t('aiConsent.retention')}
          </Text>
        </View>

        <Pressable
          onPress={handleLearnMore}
          hitSlop={4}
          accessibilityRole="link"
          accessibilityLabel={t('aiConsent.learnMore')}
          className="mb-5 self-center"
        >
          <Text className="text-[13px] font-bold text-primary underline">
            {t('aiConsent.learnMore')}
          </Text>
        </Pressable>

        <View className="flex-row gap-3 pb-5">
          <Button
            variant="outline"
            className="flex-1 h-14"
            label={t('aiConsent.notNow')}
            accessibilityHint={t('aiConsent.notNowHint')}
            onPress={handleDecline}
          />
          <Button
            variant="default"
            className="flex-1 h-14"
            label={t('aiConsent.allow')}
            accessibilityHint={t('aiConsent.allowHint')}
            onPress={handleAllow}
          />
        </View>
      </View>
    </BottomSheet>
  );
}
