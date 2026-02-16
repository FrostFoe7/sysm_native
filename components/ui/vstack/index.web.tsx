import React from "react";
import { StyleSheet } from "react-native";
import type { VariantProps } from "@gluestack-ui/utils/nativewind-utils";

import { vstackStyle } from "./styles";

type IVStackProps = React.ComponentProps<"div"> &
  VariantProps<typeof vstackStyle>;

const VStack = React.forwardRef<React.ComponentRef<"div">, IVStackProps>(
  function VStack({ className, space, reversed, ...props }, ref) {
    return (
      <div
        className={vstackStyle({
          space,
          reversed: reversed as boolean,
          class: className,
        })}
        {...props}
        style={props.style ? StyleSheet.flatten(props.style) : undefined}
        ref={ref}
      />
    );
  },
);

VStack.displayName = "VStack";

export { VStack };
