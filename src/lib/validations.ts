/**
 * AI Internship Scout - Phase 2 Zod Validation Schemas
 * Strictly validates user input for Auth, Profile, and Onboarding Target Criteria.
 */

import { z } from 'zod';

// 1. User Registration Schema
export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
  tenantId: z.string().min(3, 'Tenant ID must be specified (e.g., tenant-stanford)'),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().or(z.literal('')),
});

// 2. User Login Schema
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// 3. Target Criteria & Onboarding Preferences Schema
export const preferencesSchema = z.object({
  targetLocations: z
    .array(z.string().min(1, 'Location name cannot be empty'))
    .min(1, 'Please select at least one target location (e.g., San Francisco, CA or Remote)'),
  targetRoles: z
    .array(z.string().min(1, 'Role title cannot be empty'))
    .min(1, 'Please select at least one target role (e.g., Software Engineering Intern)'),
  preferredCompanies: z
    .array(z.string())
    .default([]),
  blacklistedCompanies: z
    .array(z.string())
    .default([]),
  customMatchThreshold: z
    .number()
    .min(0.5, 'Minimum threshold is 50% (0.50)')
    .max(0.98, 'Maximum threshold is 98% (0.98)')
    .default(0.70),
  alertMethod: z.enum(['email', 'telegram', 'webhook']).default('email'),
  alertDestination: z
    .string()
    .min(1, 'Alert destination email or username is required'),
  isActive: z.boolean().default(true),
});

// 4. User Profile Update Schema
export const profileUpdateSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().or(z.literal('')),
  isOnboarded: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
