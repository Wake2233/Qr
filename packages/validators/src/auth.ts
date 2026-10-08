import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Enter a valid email address'));

/** 6-digit email sign-in code (matches `otp_length` in supabase/config.toml). */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your email');

export const signInRequestSchema = z.object({
  email: emailSchema,
});

export const verifyCodeSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

/** Only allow same-site relative redirects after sign-in (blocks open redirects). */
export const safeRedirectSchema = z
  .string()
  .optional()
  .transform((value) =>
    value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
      ? value
      : '/',
  );

export type SignInRequest = z.infer<typeof signInRequestSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
