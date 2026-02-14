import React from 'react';
import { StyleSheet } from 'react-native';
import { centerStyle } from './styles';

import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

type ICenterProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof centerStyle>;

const Center = React.forwardRef<HTMLDivElement, ICenterProps>(function Center(
  { className, ...props },
  ref
) {
  return (
    <div 
      className={centerStyle({ class: className })} 
      {...props} 
      style={props.style ? StyleSheet.flatten(props.style) : undefined}
      ref={ref} 
    />
  );
});

Center.displayName = 'Center';

export { Center };
