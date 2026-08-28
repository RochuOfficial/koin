/**
 * Linking.openURL rejects (unhandled promise) when there's no app registered
 * to handle the URL — e.g. no Mail account configured on the Simulator.
 * canOpenURL first lets us fail with a friendly alert instead of a crash log.
 */
import { Alert, Linking } from 'react-native';

export const SUPPORT_EMAIL = 'support@piggnify.com';
/** Single source of truth for the AI Transparency page — referenced by the
 * onboarding legal links and by AiConsentModal (App Review 5.1.2(i)). */
export const AI_TRANSPARENCY_URL = 'https://piggnify.com/ai-transparency';

export async function safeOpenURL(url: string, notAvailableMessage: string, notAvailableTitle: string) {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(notAvailableTitle, notAvailableMessage);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(notAvailableTitle, notAvailableMessage);
  }
}
