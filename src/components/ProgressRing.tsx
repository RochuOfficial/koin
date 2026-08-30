import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  /**
   * Announces the ring itself as a progressbar. Applied to the SVG wrapper
   * only (not the outer container that also holds `children`) — an amount
   * rendered inside the ring stays its own separately-announced element
   * instead of being swallowed into one collapsed "X percent" node.
   */
  accessibilityLabel?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  progress,
  size = 180,
  strokeWidth = 16,
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const animatedProgress = useSharedValue(0);

  React.useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1200,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const offset = circumference - (Math.min(animatedProgress.value, 100) / 100) * circumference;
    return {
      strokeDashoffset: offset,
    };
  });

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center relative">
      <View
        style={{ transform: [{ rotate: '-90deg' }] }}
        accessible={!!accessibilityLabel}
        accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={accessibilityLabel ? { min: 0, max: 100, now: Math.round(progress) } : undefined}
      >
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#BBF7D0" // chart-subtle
            strokeWidth={strokeWidth}
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#22C55E" // chart-base
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </Svg>
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
