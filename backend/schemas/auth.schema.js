import { z } from "zod";

export const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(255);

const password = z.string()
  .min(8, "Password must be at least 8 characters.")
  .max(200)
  .regex(/[a-z]/, "Must contain a lowercase letter.")
  .regex(/[A-Z]/, "Must contain an uppercase letter.")
  .regex(/[0-9]/, "Must contain a number.");

const name = z.string().trim().min(2, "Too short.").max(60)
  .regex(/^[\p{L}\s'-]+$/u, "Letters only.");   // \p{L} keeps Albanian/Macedonian chars working

export const signupSchema = z.object({
  email, password,
  firstName: name,
  lastName: name,
  phone: z.string().trim().regex(/^\+?[0-9\s-]{6,20}$/, "Enter a valid phone number.").optional().or(z.literal("")),
});

export const loginSchema = z.object({ email, password: z.string().min(1) });
export const forgotSchema = z.object({ email });
export const resetSchema  = z.object({ token: z.string().length(64), password });
export const checkEmailSchema = z.object({ email });
