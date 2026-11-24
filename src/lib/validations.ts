/**
 * AI Internship Scout - Phase 2 Zod Validation Schemas
 * Strictly validates user input for Auth, Profile, and Onboarding Target Criteria.
 */

import { z } from 'zod';

// 1. User Registration Schema
export const registerSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(254),
  password: z.string().min(12, 'Password must be at least 12 characters long').max(128),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters long').max(100),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().or(z.literal('')),
}).strict();

// 2. User Login Schema
export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
}).strict();

// 3. Target Criteria & Onboarding Preferences Schema
export const preferencesSchema = z.object({
  targetLocations: z
    .array(z.string().trim().min(1, 'Location name cannot be empty').max(150))
    .min(1, 'Please select at least one target location (e.g., San Francisco, CA or Remote)').max(50),
  targetRoles: z
    .array(z.string().trim().min(1, 'Role title cannot be empty').max(150))
    .min(1, 'Please select at least one target role (e.g., Software Engineering Intern)').max(50),
  preferredCompanies: z
    .array(z.string().trim().max(150))
    .max(100).default([]),
  blacklistedCompanies: z
    .array(z.string().trim().max(150))
    .max(100).default([]),
  customMatchThreshold: z
    .number()
    .min(0.5, 'Minimum threshold is 50% (0.50)')
    .max(0.98, 'Maximum threshold is 98% (0.98)')
    .default(0.70),
  alertMethod: z.enum(['email', 'telegram', 'webhook']).default('email'),
  alertDestination: z
    .string().trim()
    .min(1, 'Alert destination email or username is required').max(255),
  isActive: z.boolean().default(true),
}).strict();

// 4. User Profile Update Schema
export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().or(z.literal('')),
  isOnboarded: z.boolean().optional(),
}).strict();

export const resumeCreateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  rawText: z.string().trim().min(1).max(100_000),
  parsedData: z.object({
    skills: z.array(z.string().max(100)).max(200),
    inferences: z.array(z.string().max(500)).max(100),
    projects: z.array(z.object({
      title: z.string().max(255),
      description: z.string().max(10_000),
      technologies: z.array(z.string().max(100)).max(100),
      outcomes: z.array(z.string().max(2_000)).max(100),
    }).strict()).max(100),
    experience: z.array(z.object({
      company: z.string().max(255),
      role: z.string().max(255),
      duration: z.string().max(100),
      highlights: z.array(z.string().max(2_000)).max(100),
      technologies: z.array(z.string().max(100)).max(100),
    }).strict()).max(100),
    education: z.array(z.object({
      institution: z.string().max(255),
      degree: z.string().max(255),
      graduationYear: z.string().max(10),
      gpa: z.string().max(20).optional(),
    }).strict()).max(50),
    metrics: z.object({
      latencyReduction: z.string().max(255).optional(),
      systemScale: z.string().max(255).optional(),
      gpa: z.string().max(20).optional(),
      totalYearsExperience: z.number().finite().nonnegative().optional(),
      impactKeywords: z.array(z.string().max(100)).max(100),
    }).strict(),
  }).strict(),
  isPrimary: z.boolean().optional(),
  fullTextVector: z.array(z.number().finite()).length(768).optional(),
  skillsVector: z.array(z.number().finite()).length(768).optional(),
  experienceVector: z.array(z.number().finite()).length(768).optional(),
}).strict();

export const applicationStatusSchema = z.object({
  applicationStatus: z.enum(['NEW_MATCH', 'APPLIED', 'OA_RECEIVED', 'INTERVIEWING', 'REJECTED', 'OFFER']),
}).strict();

export const requestIdSchema = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/);
export const feedbackActionSchema = z.enum(['APPLIED', 'SKIPPED', 'IRRELEVANT', 'SAVED']);
export const feedbackRecordSchema = z.object({
  candidateId: requestIdSchema.optional(),
  jobId: requestIdSchema,
  jobTitle: z.string().trim().min(1).max(255),
  companyName: z.string().trim().min(1).max(255).optional(),
  matchScore: z.number().finite().min(0).max(1),
  action: feedbackActionSchema,
  feedbackSource: z.enum(['telegram_inline', 'email_link', 'web_ui', 'api']).default('web_ui'),
  reason: z.string().max(2_000).optional(),
}).strict();

export const alertConfigurationSchema = z.object({
  telegram: z.object({
    enabled: z.boolean().optional(),
    botToken: z.string().max(500).optional(),
    chatId: z.string().max(255).optional(),
    parseMode: z.enum(['MarkdownV2', 'HTML']).optional(),
    sendSilently: z.boolean().optional(),
    includeInlineApplyButton: z.boolean().optional(),
  }).strict().optional(),
  email: z.object({
    enabled: z.boolean().optional(),
    provider: z.enum(['resend', 'sendgrid', 'postmark', 'custom_smtp']).optional(),
    apiKey: z.string().max(500).optional(),
    fromEmail: z.string().email().max(254).optional(),
    fromName: z.string().max(255).optional(),
    toEmail: z.union([z.string().email().max(254), z.literal('')]).optional(),
    replyTo: z.union([z.string().email().max(254), z.literal('')]).optional(),
    subjectTemplate: z.string().max(500).optional(),
  }).strict().optional(),
  rules: z.object({
    minScoreThreshold: z.number().finite().min(0).max(1).optional(),
    requireLayer2Match: z.boolean().optional(),
    allowDisqualified: z.boolean().optional(),
    dedupWindowHours: z.number().finite().int().min(0).max(720).optional(),
    maxAlertsPerDay: z.number().finite().int().min(1).max(10_000).optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStartUtc: z.number().finite().int().min(0).max(23).optional(),
    quietHoursEndUtc: z.number().finite().int().min(0).max(23).optional(),
  }).strict().optional(),
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
