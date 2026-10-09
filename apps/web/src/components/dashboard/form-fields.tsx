'use client';

import { centsToDollarInput, parseDollarsToCents } from '@cp/core';
import { useId, useState, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const NONE = '__none__';

export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
  }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-muted-foreground text-xs font-normal">(required to publish)</span>
        ) : null}
      </Label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type FieldProps = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string };

/** Whole/decimal number input that maps "" ↔ null. */
export function NumberInput({
  value,
  onChange,
  decimals = 0,
  ...props
}: FieldProps & {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  decimals?: 0 | 1;
  placeholder?: string;
  onBlur?: () => void;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  // Sync when the value changes from outside (reset, VIN decode) without clobbering typing.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    const typed = Number(text.replace(/,/g, ''));
    if (!(text.trim() && typed === value)) setText(value == null ? '' : String(value));
  }
  return (
    <Input
      {...props}
      inputMode={decimals ? 'decimal' : 'numeric'}
      value={text}
      onChange={(event) => {
        const next = event.target.value;
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
export function MoneyInput({
  value,
  onChange,
  ...props
}: FieldProps & {
  value: number | null | undefined;
  onChange: (cents: number | null) => void;
  onBlur?: () => void;
}) {
  const [text, setText] = useState(centsToDollarInput(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (parseDollarsToCents(text) !== value) setText(centsToDollarInput(value));
  }
  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
        $
      </span>
      <Input
        {...props}
        inputMode="decimal"
        className="pl-7 tabular-nums"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange(parseDollarsToCents(event.target.value));
        }}
      />
    </div>
  );
}

/** Select over a fixed set of options, with an optional "Not set" choice mapping to null. */
export function OptionSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  allowNone = true,
  disabled,
  ...props
}: FieldProps & {
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value == null ? (allowNone ? NONE : '') : String(value)}
      onValueChange={(next) => {
        // Radix re-emits the current value when it's set programmatically; ignore no-ops.
        if (next === (value == null ? NONE : String(value))) return;
        if (next === NONE) return onChange(null);
        // Unknown values (e.g. "" while dependent options are still loading) are not user choices.
        const match = options.find((option) => String(option.value) === next);
        if (match) onChange(match.value);
      }}
      disabled={disabled}
    >
      <SelectTrigger {...props} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone ? <SelectItem value={NONE}>Not set</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** `{ a: 'A' }` → `[{ value: 'a', label: 'A' }]` for enum label maps. */
export const optionsOf = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
