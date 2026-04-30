import * as React from "react";
import { TouchableOpacity, Text, type TouchableOpacityProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center gap-2 rounded-full transition-all active:scale-[0.98] disabled:opacity-50",
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
  extends TouchableOpacityProps,
    VariantProps<typeof buttonVariants> {
  label?: string;
  textClassName?: string;
}

const Button = React.forwardRef<React.ElementRef<typeof TouchableOpacity>, ButtonProps>(
  ({ className, textClassName, variant, size, label, children, ...props }, ref) => {
    return (
      <TouchableOpacity
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {label ? (
          <Text className={cn(buttonTextVariants({ variant, size, className: textClassName }))}>
            {label}
          </Text>
        ) : children}
      </TouchableOpacity>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants, buttonTextVariants };
