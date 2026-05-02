import * as React from "react";
import { Pressable, Text, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-full disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        outline: "border border-outline bg-transparent",
        secondary: "bg-secondary",
        ghost: "bg-transparent",
        link: "bg-transparent",
        tonal: "bg-primary-container",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4",
        lg: "h-14 px-8",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const buttonTextVariants = cva(
  "text-center font-medium",
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: "text-primary",
        secondary: "text-secondary-foreground",
        ghost: "text-primary",
        link: "text-primary underline",
        tonal: "text-on-primary-container",
      },
      size: {
        default: "text-base",
        sm: "text-sm",
        lg: "text-lg",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends PressableProps,
    VariantProps<typeof buttonVariants> {
  label?: string;
  textClassName?: string;
}

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  ({ className, textClassName, variant, size, label, children, onPressIn, onPressOut, style, ...props }, ref) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scale.value }],
      };
    });

    const handlePressIn = (e: any) => {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
      if (onPressIn) onPressIn(e);
    };

    const handlePressOut = (e: any) => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      if (onPressOut) onPressOut(e);
    };

    return (
      <AnimatedPressable
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, style as any]}
        {...props}
      >
        {label ? (
          <Text className={cn(buttonTextVariants({ variant, size, className: textClassName }))}>
            {label}
          </Text>
        ) : children}
      </AnimatedPressable>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants, buttonTextVariants };
