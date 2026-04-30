import * as React from "react";
import { Switch as RNSwitch, type SwitchProps } from "react-native";

const Switch = React.forwardRef<React.ElementRef<typeof RNSwitch>, SwitchProps>(
  ({ ...props }, ref) => {
    return (
      <RNSwitch
        ref={ref}
        trackColor={{ false: "#3f3f46", true: "#10b981" }}
        thumbColor={"#ffffff"}
        {...props}
      />
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
