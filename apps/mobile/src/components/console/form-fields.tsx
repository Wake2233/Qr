import { centsToDollarInput, parseDollarsToCents } from '@cp/core';
import { useState, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { cn } from '@/lib/cn';

import { OptionSheet, type Option } from './option-sheet';

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-4 rounded-lg border border-border bg-card p-4">
      <View className="gap-1">
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  error,
  required,
  allowNone = true,
  disabled,
  placeholder = 'Select…',
}: {
  label: string;
  value: T | null | undefined;
  options: readonly Option<T>[];
  onChange: (value: T | null) => void;
  error?: string;
  required?: boolean;
  allowNone?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View className="gap-2">
      <Text variant="label">
        {label}
        {required ? <Text variant="caption"> (required to publish)</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'not set'}`}
        accessibilityHint={error}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(
          'h-12 flex-row items-center justify-between rounded-md border px-3',
          error ? 'border-destructive' : 'border-input',
          disabled && 'opacity-50',
        )}
      >
        <Text className={cn(!selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </Text>
        <Text variant="muted">▾</Text>
      </Pressable>
      {error ? (
        <Text variant="caption" className="text-destructive">
          {error}
        </Text>
      ) : null}
      <OptionSheet
        visible={open}
        title={label}
        options={options}
        value={value}
        allowNone={allowNone}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

/** Numeric text input mapping "" ↔ null. */
export function NumberField({
  label,
  value,
  onChange,
  decimals = 0,
  error,
  required,
  placeholder,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  decimals?: 0 | 1;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (Number(text.replace(/,/g, '')) !== value) setText(value == null ? '' : String(value));
  }
  return (
    <TextField
      label={label}
      required={required}
      error={error}
      placeholder={placeholder}
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      value={text}
      onChangeText={(next) => {
        setText(next);
        const cleaned = next.replace(/,/g, '').trim();
        if (!cleaned) return onChange(null);
        const n = decimals ? Number.parseFloat(cleaned) : Number.parseInt(cleaned, 10);
        onChange(Number.isFinite(n) ? n : null);
      }}
    />
  );
}

/** Dollar input stored as integer cents. */
export function MoneyField({
  label,
  value,
  onChange,
  error,
  required,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (cents: number | null) => void;
  error?: string;
  required?: boolean;
  hint?: string;
}) {
  const [text, setText] = useState(centsToDollarInput(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (parseDollarsToCents(text) !== value) setText(centsToDollarInput(value));
  }
  return (
    <TextField
      label={`${label} ($)`}
      required={required}
      error={error}
      hint={hint}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={(next) => {
        setText(next);
        onChange(parseDollarsToCents(next));
      }}
    />
  );
}

export function SwitchRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-4">
      <View className="flex-1">
        <Text variant="label">{label}</Text>
        {description ? <Text variant="caption">{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

/** `{ a: 'A' }` → options for enum label maps. */
export const optionsOf = <T extends string>(labels: Record<T, string>): Option<T>[] =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
