'use client';

import { verifyCodeSchema, signInRequestSchema, type VerifyCodeInput } from '@cp/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { requestSignInCode, verifySignInCode } from '@/app/(auth)/login/actions';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginFormProps {
  next?: string;
  initialError?: string;
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | undefined>(initialError);
  const [sentTo, setSentTo] = useState('');
  const [pending, startTransition] = useTransition();

  const emailForm = useForm({
    resolver: zodResolver(signInRequestSchema),
    defaultValues: { email: '' },
  });
  const codeForm = useForm<VerifyCodeInput>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { email: '', code: '' },
  });

  const onRequest = emailForm.handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await requestSignInCode(values, next);
      if (!result.ok) {
        setError(result.fieldErrors?.email?.[0] ?? result.error);
        return;
      }
      codeForm.reset({ email: result.data.email, code: '' });
      setSentTo(result.data.email);
      setStep('code');
    });
  });

  const onVerify = codeForm.handleSubmit((values) => {
    setError(undefined);
    startTransition(async () => {
      const result = await verifySignInCode(values, next);
      if (!result.ok) {
        setError(result.fieldErrors?.code?.[0] ?? result.error);
        return;
      }
      // The session cookie was set by the Server Action; let client widgets pick it up.
      await refreshAuth();
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  });

  if (step === 'code') {
    return (
      <form onSubmit={onVerify} className="space-y-5" noValidate>
        <p className="text-muted-foreground text-sm">
          We sent a 6-digit code to <span className="text-foreground font-medium">{sentTo}</span>.
        </p>
        <div className="space-y-2">
          <Label htmlFor="code">Sign-in code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            aria-invalid={Boolean(codeForm.formState.errors.code) || undefined}
            className="text-center font-mono text-lg tracking-[0.5em]"
            {...codeForm.register('code')}
          />
        </div>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Verifying…' : 'Sign in'}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('email')}>
          Use a different email
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onRequest} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(emailForm.formState.errors.email) || undefined}
          {...emailForm.register('email')}
        />
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? 'Sending code…' : 'Email me a sign-in code'}
      </Button>
      <p className="text-muted-foreground text-xs">
        No password needed. New here? Your account is created when you sign in.
      </p>
    </form>
  );
}
