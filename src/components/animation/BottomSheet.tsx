import { useEffect, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { KeyboardEvent, LayoutChangeEvent } from 'react-native';
import type { ReactNode } from 'react';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { springPresets, timingPresets } from '@/lib/springPresets';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Fires once the sheet's native <Modal> has actually been unmounted (animation finished), not when close is merely requested. Use this instead of guessing at the close-animation duration to sequence a follow-up modal (see #177). */
  onClosed?: () => void;
  children: ReactNode;
  maxHeight?: number;
}

/**
 * Gesture-driven bottom sheet (guide §5.2): drag handle tracks the finger 1:1,
 * release hands off to a velocity-aware (non-bouncy, critically damped) spring
 * snap, and the backdrop fades from the same translateY shared value that
 * drives the sheet transform. Programmatic open/close (driven by `visible`,
 * not a live gesture) uses a smooth ease-in-out `withTiming` instead — no
 * overshoot, per guide §3 rule 3 (timing is for non-interruptible, decorative
 * state changes; the interactive drag path stays on a spring).
 *
 * Sheet height is content-driven (measured via onLayout, capped at `maxHeight`)
 * rather than fixed, so short content (e.g. a calendar) doesn't stretch to fill
 * the screen.
 */
export function BottomSheet({ visible, onClose, onClosed, children, maxHeight }: BottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cap = maxHeight ?? windowHeight * 0.9;

  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(0);
  const translateY = useSharedValue(windowHeight);
  const startY = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    // This content renders inside a native Modal, which presents in its own
    // window/layer on iOS — KeyboardAvoidingView's measureInWindow-based
    // offset calculation doesn't resolve correctly across that boundary, so
    // it silently no-ops here. Track the keyboard height directly instead
    // and drive the sheet's own transform with it. iOS fires `will` events
    // ahead of the animation (letting our shared-value timing sync with it);
    // Android only reliably fires the `did` variants.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      // `endCoordinates.height` measures from the very bottom of the screen,
      // which overlaps the safe-area padding already reserved on the sheet —
      // subtract it so the sheet doesn't get shifted up further than needed.
      const height = Math.max(0, e.endCoordinates.height - insets.bottom);
      keyboardOffset.value = withTiming(height, { duration: e.duration || 250 });
    };
    const onHide = (e: KeyboardEvent) => {
      keyboardOffset.value = withTiming(0, { duration: e.duration || 250 });
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClosed = () => {
    setMounted(false);
    onClosed?.();
  };

  useEffect(() => {
    if (!mounted) return;
    if (visible && sheetHeight > 0) {
      translateY.value = withTiming(0, timingPresets.sheet);
    } else if (!visible) {
      translateY.value = withTiming(sheetHeight || windowHeight, timingPresets.sheet, (finished) => {
        if (finished) runOnJS(handleClosed)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, sheetHeight, mounted]);

  const handleContentLayout = (e: LayoutChangeEvent) => {
    setSheetHeight(e.nativeEvent.layout.height);
  };

  const snapHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const handlePan = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(0, startY.value + e.translationY);
    })
    .onEnd((e) => {
      const shouldClose = e.velocityY > 500 || translateY.value > sheetHeight / 3;
      if (shouldClose) {
        translateY.value = withSpring(
          sheetHeight,
          { ...springPresets.sheet, velocity: e.velocityY },
          (finished) => {
            if (finished) {
              runOnJS(snapHaptic)();
              runOnJS(onClose)();
            }
          }
        );
      } else {
        translateY.value = withSpring(0, { ...springPresets.sheet, velocity: e.velocityY }, (finished) => {
          if (finished) runOnJS(snapHaptic)();
        });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight || windowHeight], [0.4, 0], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboardOffset.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* RN's Modal renders into its own native window on Android, outside the
          app's top-level GestureHandlerRootView — without a nested root here,
          GestureDetectors inside the sheet (drag handle, buttons) never
          register and silently swallow all touches on Android. */}
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
            {/* Tap-to-dismiss scrim, not a labelled control — every sheet's own
                content provides an accessible close affordance, so this must be
                hidden rather than named or VoiceOver offers a full-screen
                nameless button above the sheet's real content. */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Animated.View>

          <Animated.View
            onLayout={handleContentLayout}
            style={[
              styles.sheet,
              { maxHeight: cap, paddingBottom: Math.max(insets.bottom, 20) },
              sheetStyle,
            ]}
          >
            <GestureDetector gesture={handlePan}>
              <View style={styles.handleZone}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
  },
  handleZone: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
});
