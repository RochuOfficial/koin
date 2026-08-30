/**
 * Billing period, renewal, and cancellation terms plus the Terms of Service /
 * Privacy Policy links — required at the point of purchase, not two screens
 * away in Settings (App Review Guideline 3.1.2). Branch-independent: usable
 * as-is whether Piggy ends up reader-model (Settings only, no purchase
 * screen — see implementations/APP_REVIEW_BLOCKERS.md Phase 6 Branch A) or
 * adds StoreKit IAP (rendered directly above the paywall CTA — Branch B).
 *
 * Deliberately three separate sentences rather than one sentence with inline
 * link placeholders — matching the plain-list pattern already used for the
 * five onboarding legal links (LegalLinksNote, app/onboarding.tsx) rather
 * than composing a single grammatically-correct multi-language sentence
 * around tappable spans, which is fragile to translate.
 */
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { safeOpenURL, PRIVACY_URL, TERMS_URL } from '@/lib/linking';

export function BillingTerms() {
  const { t } = useTranslation('plans');

  const openTerms = () => {
    Haptics.selectionAsync();
    safeOpenURL(TERMS_URL, t('terms.linkError'), t('common:notAvailable'));
  };
  const openPrivacy = () => {
    Haptics.selectionAsync();
    safeOpenURL(PRIVACY_URL, t('terms.linkError'), t('common:notAvailable'));
  };

  return (
    <View className="items-center gap-1.5 px-4">
      <Text className="text-[11px] leading-4 text-on-surface-variant/50 text-center">
        {t('terms.billing')}
      </Text>
      <Text className="text-[11px] leading-4 text-on-surface-variant/50 text-center">
        {t('terms.cancel')}
      </Text>
      <Text className="text-[11px] leading-4 text-on-surface-variant/50 text-center">
        {t('terms.planMechanics')}
      </Text>
      <View className="flex-row items-center gap-3 mt-1">
        <Pressable onPress={openTerms} hitSlop={6} accessibilityRole="link" accessibilityLabel={t('terms.termsOfUse')}>
          <Text className="text-[11px] font-bold text-primary underline">{t('terms.termsOfUse')}</Text>
        </Pressable>
        <Text className="text-[11px] text-on-surface-variant/40">·</Text>
        <Pressable onPress={openPrivacy} hitSlop={6} accessibilityRole="link" accessibilityLabel={t('terms.privacyPolicy')}>
          <Text className="text-[11px] font-bold text-primary underline">{t('terms.privacyPolicy')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
