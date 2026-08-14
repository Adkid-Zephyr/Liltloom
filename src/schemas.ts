/** Zod schemas and the single durable DSH storage-domain declaration. */

import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type {
  ActivationSet,
  EvidenceAggregate,
  PreferenceAtom,
  ProcessingWatermark,
  ProfileMeta,
  ResourceLedger,
  SelfDescription,
  StyleExemplar,
  StyleMemorySettings,
  PortableStyleMemory,
} from './types.js'

const registerSchema = z.enum(['default', 'technical', 'professional', 'social', 'longform'])
const categorySchema = z.enum([
  'tone', 'verbosity', 'structure', 'sentence-rhythm', 'vocabulary', 'formatting', 'avoidance', 'explicit-rule',
])
const sourceClassSchema = z.enum(['user-explicit', 'user-revision', 'strong-observation', 'weak-observation'])
const statusSchema = z.enum(['active', 'suppressed', 'review'])
const profileScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('global') }),
  z.object({ kind: z.literal('workspace'), workspace: z.string().min(1) }),
])

export const preferenceAtomSchema: z.ZodType<PreferenceAtom> = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  profileScope: profileScopeSchema,
  featureKey: z.string().min(1),
  category: categorySchema,
  register: registerSchema,
  statement: z.string().min(1).max(1000),
  sourceClass: sourceClassSchema,
  confidence: z.number().min(0).max(1),
  evidenceCount: z.number().int().positive(),
  status: statusSchema,
  locked: z.boolean(),
  firstSeenAt: z.string().min(1),
  lastSeenAt: z.string().min(1),
})

export const aggregateSchema: z.ZodType<EvidenceAggregate> = z.object({
  id: z.string().min(1),
  profileScope: profileScopeSchema,
  register: registerSchema,
  sampleCount: z.number().int().nonnegative(),
  totalChars: z.number().int().nonnegative(),
  totalSentences: z.number().int().nonnegative(),
  totalParagraphs: z.number().int().nonnegative(),
  totalLines: z.number().int().nonnegative(),
  bulletLines: z.number().int().nonnegative(),
  headingLines: z.number().int().nonnegative(),
  emojiCount: z.number().int().nonnegative(),
  exclamationCount: z.number().int().nonnegative(),
  questionCount: z.number().int().nonnegative(),
  cjkPunctuationCount: z.number().int().nonnegative(),
  asciiPunctuationCount: z.number().int().nonnegative(),
  firstObservedAt: z.string().min(1),
  lastObservedAt: z.string().min(1),
})

export const exemplarSchema: z.ZodType<StyleExemplar> = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  profileScope: profileScopeSchema,
  register: registerSchema,
  text: z.string().min(1).max(1200),
  sourceKind: z.enum(['user-authored-message', 'user-approved-import', 'revision-after']),
  sourceFingerprint: z.string().min(16),
  classificationConfidence: z.number().min(0).max(1),
  redactionCount: z.number().int().nonnegative(),
  quality: z.number().min(0).max(1),
  status: statusSchema,
  locked: z.boolean(),
  consentVersion: z.number().int().positive(),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1).nullable(),
})

export const settingsSchema: z.ZodType<StyleMemorySettings> = z.object({
  schemaVersion: z.literal(1),
  observationState: z.enum(['off', 'learning', 'paused']),
  invocationMode: z.enum(['disabled', 'explicit', 'configured-auto']),
  modelToolEnabled: z.boolean(),
  autoWorkspaceGlobs: z.array(z.string().min(1)).max(100),
  deepStyleEnabled: z.boolean(),
  deepStyleConsentVersion: z.number().int().positive().nullable(),
  deepStyleRetentionDays: z.number().int().min(1).max(3650),
  deepStyleMaxExcerptChars: z.number().int().min(100).max(1200),
  deepStyleMaxRecords: z.number().int().min(1).max(200),
  deepStyleMaxTotalChars: z.number().int().min(1000).max(240000),
  analysisEnabled: z.boolean(),
  analysisConsentVersion: z.number().int().positive().nullable(),
  allowSelfContextInCompilation: z.boolean(),
  updatedAt: z.string().min(1),
})

const styleContextPacketSchema = z.object({
  schemaVersion: z.literal(1),
  profileRevision: z.number().int().nonnegative(),
  register: registerSchema,
  purpose: z.enum(['imitate', 'adapt', 'review']),
  selectedPreferenceIds: z.array(z.string()),
  rules: z.array(z.string()),
  avoid: z.array(z.string()),
  exemplars: z.array(exemplarSchema).optional(),
  selfContext: z.object({
    sourceRevision: z.number().int().positive(),
    traits: z.array(z.string()),
    communicationPreferences: z.array(z.string()),
    values: z.array(z.string()),
    derivedAt: z.string(),
    modelRoute: z.string().optional(),
  }).optional(),
  confidence: z.number().min(0).max(1),
  tokenBudget: z.number().int().positive(),
  estimatedTokens: z.number().int().nonnegative(),
  renderedContext: z.string(),
})

export const activationSchema: z.ZodType<ActivationSet> = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  packet: styleContextPacketSchema,
  scope: z.enum(['next-response', 'session']),
  authorization: z.enum(['explicit-request', 'user-action', 'configured-auto-rule']),
  createdAt: z.string().min(1),
  status: z.enum(['active', 'consumed', 'revoked']),
})

export const selfDescriptionSchema: z.ZodType<SelfDescription> = z.object({
  revision: z.number().int().positive(),
  text: z.string().min(1).max(50000),
  source: z.literal('user-authored'),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const watermarkSchema: z.ZodType<ProcessingWatermark> = z.object({
  sessionId: z.string().min(1),
  throughSeq: z.number().int().gte(-1),
  updatedAt: z.string().min(1),
})

export const profileMetaSchema: z.ZodType<ProfileMeta> = z.object({
  id: z.literal('profile'),
  revision: z.number().int().nonnegative(),
  updatedAt: z.string().min(1),
})

export const resourceLedgerSchema: z.ZodType<ResourceLedger> = z.object({
  periodStart: z.string().min(1),
  calls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  priceStatus: z.enum(['known', 'free', 'unknown', 'not-applicable']),
})

export const styleMemoryDomainSpec = defineDomain({
  name: 'style_memory',
  version: 1,
  tables: {
    preferences: domainTable<string, PreferenceAtom>(preferenceAtomSchema),
    aggregates: domainTable<string, EvidenceAggregate>(aggregateSchema),
    exemplars: domainTable<string, StyleExemplar>(exemplarSchema),
    settings: domainTable<string, StyleMemorySettings>(settingsSchema),
    activations: domainTable<string, ActivationSet>(activationSchema),
    self_description: domainTable<string, SelfDescription>(selfDescriptionSchema),
    watermarks: domainTable<string, ProcessingWatermark>(watermarkSchema),
    profile: domainTable<string, ProfileMeta>(profileMetaSchema),
    resources: domainTable<string, ResourceLedger>(resourceLedgerSchema),
  },
})

export const analysisProposalSchema = z.object({
  observations: z.array(z.object({
    category: categorySchema,
    register: registerSchema,
    statement: z.string().min(1).max(240),
    confidence: z.number().min(0).max(0.8),
  })).max(8),
})

export const portableStyleMemorySchema: z.ZodType<PortableStyleMemory> = z.object({
  schemaVersion: z.literal(1),
  product: z.enum(['dsh-liltloom', 'dsh-style-memory']),
  exportedAt: z.string().min(1),
  preferences: z.array(preferenceAtomSchema).max(100000),
  exemplars: z.array(exemplarSchema).max(200),
  selfDescription: selfDescriptionSchema.optional(),
})
