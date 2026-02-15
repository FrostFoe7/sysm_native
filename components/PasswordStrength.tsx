// components/PasswordStrength.tsx
// Visual password strength meter

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

interface PasswordStrengthProps {
  password: string;
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'bg-brand-border' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-brand-red' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-green-500' };
  return { score: 5, label: 'Very strong', color: 'bg-green-400' };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { score, label, color } = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <View className="mt-1 gap-1">
      <View className="flex-row gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            className={`h-[3px] flex-1 rounded-full ${i <= score ? color : 'bg-brand-border'}`}
          />
        ))}
      </View>
      <Text className="text-[11px] text-brand-muted">{label}</Text>
    </View>
  );
}
