import React from "react";
import { StyleSheet } from "react-native";
import { cardStyle } from "./styles";
import type { VariantProps } from "@gluestack-ui/utils/nativewind-utils";

type ICardProps = React.ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof cardStyle>;

const Card = React.forwardRef<HTMLDivElement, ICardProps>(function Card(
  { className, size = "md", variant = "elevated", ...props },
  ref,
) {
  return (
    <div
      className={cardStyle({ size, variant, class: className })}
      {...props}
      style={props.style ? StyleSheet.flatten(props.style) : undefined}
      ref={ref}
    />
  );
});

Card.displayName = "Card";

export { Card };
