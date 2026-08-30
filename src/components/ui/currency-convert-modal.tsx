/**
 * Confirm step shown after picking a new currency in Settings, but only when
 * the profile actually has monetary data to do something with
 * (`hasConvertibleMonetaryData` — see app/settings.tsx). Lets the user either
 * convert every stored amount using a fetched rate, or just relabel and keep
 * the numbers as-is. Styling mirrors DeepAnalysisConfirmModal/DobConfirmModal.
 */
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, ArrowLeftRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from '@/components/animation/BottomSheet';
import { Button } from './button';

interface CurrencyConvertModalProps {
  isVisible: boolean;
  fromCurrency: string;
  toCurrency: string;
  /** null while loading, or when a rate couldn't be fetched (see `unavailable`). */
  rate: number | null;
  loading: boolean;
  /** True once loading finished but no rate came back (unsupported currency or fetch failure). */
  unavailable: boolean;
  onConvert: () => void;
  onKeepNumbers: () => void;
  onClose: () => void;
}

/** Display-only rounding for the rate line — the actual conversion math (currencyConversion.ts) rounds independently. */
function formatRate(rate: number): string {
  return (Math.ceil(rate * 10000) / 10000).toString();
}

export function CurrencyConvertModal({
  isVisible,
  fromCurrency,
  toCurrency,
  rate,
  loading,
  unavailable,
  onConvert,
  onKeepNumbers,
  onClose,
}: CurrencyConvertModalProps) {
  const { t } = useTranslation('settings');

  const handleClose = () => {
    if (loading) return;
    Haptics.selectionAsync();
    onClose();
  };

  return (
    <BottomSheet visible={isVisible} onClose={handleClose}>
      <View className="px-5 pt-2">
        <View className="items-end">
          <Pressable
            onPress={handleClose}
            hitSlop={6}
            disabled={loading}
            style={loading ? { opacity: 0.3 } : undefined}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-container"
            accessibilityRole="button"
            accessibilityLabel={t('common:a11y.close')}
            accessibilityState={{ disabled: loading }}
          >
            <X size={18} color="#64748B" />
          </Pressable>
        </View>

        <View className="items-center -mt-2 mb-4">
          <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary-container mb-4">
            <ArrowLeftRight size={28} color="#1D4ED8" />
          </View>
          <Text className="text-xl font-black text-on-surface text-center">
            {t('currencyConvertModal.title')}
          </Text>
          <Text className="mt-2 text-sm font-medium text-on-surface-variant text-center px-2">
            {t('currencyConvertModal.body', { from: fromCurrency, to: toCurrency })}
          </Text>

          {loading ? (
            <ActivityIndicator className="mt-4" color="#1D4ED8" />
          ) : unavailable ? (
            <Text className="mt-4 text-sm font-medium text-on-surface-variant text-center px-2">
              {t('currencyConvertModal.unavailableNote', { to: toCurrency })}
            </Text>
          ) : rate != null ? (
            <Text className="mt-4 text-base font-bold text-primary text-center">
              {t('currencyConvertModal.rateLine', { from: fromCurrency, to: toCurrency, rate: formatRate(rate) })}
            </Text>
          ) : null}
        </View>

        <View className="flex-row gap-3 pb-5">
          <Button
            variant="outline"
            className="flex-1 h-14"
            label={t('currencyConvertModal.keepNumbers')}
            onPress={onKeepNumbers}
            disabled={loading}
          />
          {!unavailable && (
            <Button
              variant="default"
              className="flex-1 h-14"
              label={t('currencyConvertModal.convert')}
              onPress={onConvert}
              disabled={loading || rate == null}
            />
          )}
        </View>
      </View>
    </BottomSheet>
  );
}
