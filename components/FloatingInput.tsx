// components/FloatingInput.tsx

import React, { useState } from 'react';
import { View, TextInput, Pressable, Platform, TextInputProps } from 'react-native';
import { Text } from '@/components/ui/text';
import { EyeIcon, EyeOffIcon } from '@/constants/icons';

interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  placeholder?: string;
  autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  maxLength?: number;
  rightElement?: React.ReactNode;
}

export function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  error,
  placeholder,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  maxLength,
  rightElement,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const showLabel = isFocused || value.length > 0;

  return (
    <View className="w-full">
      <View
        className={`relative h-[56px] justify-center rounded-xl border px-4 ${
          error 
            ? 'border-brand-red' 
            : isFocused 
              ? 'border-brand-blue' 
              : 'border-brand-border bg-brand-elevated'
        }`}
      >
        {showLabel && (
          <Text
            className={`absolute left-4 top-2 text-[11px] font-semibold ${
              error ? 'text-brand-red' : 'text-brand-blue'
            }`}
          >
            {label}
          </Text>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={!showLabel ? placeholder || label : ''}
          placeholderTextColor="#555555"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          className="text-[15px] text-brand-light"
          style={{
            paddingTop: showLabel ? 12 : 0,
            paddingRight: secureTextEntry || rightElement ? 32 : 0,
            ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
          }}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute right-4 top-[18px]"
            hitSlop={10}
          >
            {isPasswordVisible ? (
              <EyeOffIcon size={20} color="#777777" />
            ) : (
              <EyeIcon size={20} color="#777777" />
            )}
          </Pressable>
        ) : rightElement ? (
          <View className="absolute right-4 top-[18px]">
            {rightElement}
          </View>
        ) : null}
      </View>
      {error && (
        <Text className="ml-1 mt-1 text-[12px] text-brand-red">{error}</Text>
      )}
    </View>
  );
}
