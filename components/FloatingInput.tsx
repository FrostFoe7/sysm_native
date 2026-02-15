// components/FloatingInput.tsx
// Instagram-style floating label text input

import React, { useState, useRef, useCallback } from 'react';
import { TextInput, View, Pressable, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Eye, EyeOff } from 'lucide-react-native';

interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;
  maxLength?: number;
  editable?: boolean;
  rightElement?: React.ReactNode;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'go' | 'send';
}

export function FloatingInput({
  label,
  value,
  onChangeText,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  maxLength,
  editable = true,
  rightElement,
  onSubmitEditing,
  returnKeyType,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isActive = isFocused || value.length > 0;

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const borderColor = error
    ? 'border-brand-red'
    : isFocused
      ? 'border-brand-blue'
      : 'border-brand-border';

  return (
    <View>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        className={`relative rounded-xl border ${borderColor} bg-[#1a1a1a] px-4 pt-5 pb-2`}
      >
        {/* Floating label */}
        <Text
          className={`absolute left-4 transition-all ${
            isActive
              ? 'top-1.5 text-[11px] text-brand-muted'
              : 'top-4 text-[15px] text-[#666]'
          }`}
          style={Platform.OS === 'web' ? { transition: 'all 0.15s ease' } as any : undefined}
        >
          {label}
        </Text>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete as any}
          maxLength={maxLength}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          className="text-[15px] text-brand-light"
          placeholderTextColor="transparent"
          style={{ minHeight: 24 }}
        />

        {/* Right element: password toggle or custom */}
        {(secureTextEntry || rightElement) && (
          <View className="absolute right-3 top-0 bottom-0 justify-center">
            {secureTextEntry ? (
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={12}>
                {showPassword ? (
                  <EyeOff size={20} color="#666" />
                ) : (
                  <Eye size={20} color="#666" />
                )}
              </Pressable>
            ) : (
              rightElement
            )}
          </View>
        )}
      </Pressable>

      {/* Error message */}
      {error && (
        <Text className="mt-1 ml-1 text-[12px] text-brand-red">{error}</Text>
      )}
    </View>
  );
}
