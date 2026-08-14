/** Public and durable vocabulary for Liltloom. */

export type Register = 'default' | 'technical' | 'professional' | 'social' | 'longform'
export type PreferenceCategory =
  | 'tone'
  | 'verbosity'
  | 'structure'
  | 'sentence-rhythm'
  | 'vocabulary'
  | 'formatting'
  | 'avoidance'
  | 'explicit-rule'

export type SourceClass = 'user-explicit' | 'user-revision' | 'strong-observation' | 'weak-observation'
export type PreferenceStatus = 'active' | 'suppressed' | 'review'
export type InvocationMode = 'disabled' | 'explicit' | 'configured-auto'
export type ProfileScope = { kind: 'global' } | { kind: 'workspace'; workspace: string }

export interface PreferenceAtom {
  id: string
  revision: number
  profileScope: ProfileScope
  featureKey: string
  category: PreferenceCategory
  register: Register
  statement: string
  sourceClass: SourceClass
  confidence: number
  evidenceCount: number
  status: PreferenceStatus
  locked: boolean
  firstSeenAt: string
  lastSeenAt: string
}

export interface EvidenceAggregate {
  id: string
  profileScope: ProfileScope
  register: Register
  sampleCount: number
  totalChars: number
  totalSentences: number
  totalParagraphs: number
  totalLines: number
  bulletLines: number
  headingLines: number
  emojiCount: number
  exclamationCount: number
  questionCount: number
  cjkPunctuationCount: number
  asciiPunctuationCount: number
  firstObservedAt: string
  lastObservedAt: string
}

export interface StyleExemplar {
  id: string
  revision: number
  profileScope: ProfileScope
  register: Register
  text: string
  sourceKind: 'user-authored-message' | 'user-approved-import' | 'revision-after'
  sourceFingerprint: string
  classificationConfidence: number
  redactionCount: number
  quality: number
  status: PreferenceStatus
  locked: boolean
  consentVersion: number
  createdAt: string
  expiresAt: string | null
}

export interface StyleMemorySettings {
  schemaVersion: 1
  observationState: 'off' | 'learning' | 'paused'
  invocationMode: InvocationMode
  modelToolEnabled: boolean
  autoWorkspaceGlobs: string[]
  deepStyleEnabled: boolean
  deepStyleConsentVersion: number | null
  deepStyleRetentionDays: number
  deepStyleMaxExcerptChars: number
  deepStyleMaxRecords: number
  deepStyleMaxTotalChars: number
  analysisEnabled: boolean
  analysisConsentVersion: number | null
  allowSelfContextInCompilation: boolean
  updatedAt: string
}

export interface StyleContextPacket {
  schemaVersion: 1
  profileRevision: number
  register: Register
  purpose: 'imitate' | 'adapt' | 'review'
  selectedPreferenceIds: string[]
  rules: string[]
  avoid: string[]
  exemplars?: StyleExemplar[] | undefined
  selfContext?: DerivedSelfContext | undefined
  confidence: number
  tokenBudget: number
  estimatedTokens: number
  renderedContext: string
}

export interface CompileStyleRequest {
  purpose?: StyleContextPacket['purpose'] | undefined
  register?: Register | undefined
  workspace?: string | undefined
  depth?: 'basic' | 'deep' | undefined
  budgetTokens?: number | undefined
  includeSelfContext?: boolean | undefined
  selectedPreferenceIds?: string[] | undefined
}

export interface ActivationSet {
  id: string
  sessionId: string
  packet: StyleContextPacket
  scope: 'next-response' | 'session'
  authorization: 'explicit-request' | 'user-action' | 'configured-auto-rule'
  createdAt: string
  status: 'active' | 'consumed' | 'revoked'
}

export interface SelfDescription {
  revision: number
  text: string
  source: 'user-authored'
  createdAt: string
  updatedAt: string
}

export interface DerivedSelfContext {
  sourceRevision: number
  traits: string[]
  communicationPreferences: string[]
  values: string[]
  derivedAt: string
  modelRoute?: string | undefined
}

export interface ProcessingWatermark {
  sessionId: string
  throughSeq: number
  updatedAt: string
}

export interface ProfileMeta {
  id: 'profile'
  revision: number
  updatedAt: string
}

export interface ResourceLedger {
  periodStart: string
  calls: number
  inputTokens: number
  outputTokens: number
  priceStatus: 'known' | 'free' | 'unknown' | 'not-applicable'
}

export interface StyleMemoryStatus {
  settings: StyleMemorySettings
  profileRevision: number
  preferences: number
  exemplars: number
  learnedMessages: number
  analysisRoute?: { provider: string; model: string } | undefined
  analysisResource: {
    periodStart: string
    calls: number
    inputTokens: number
    outputTokens: number
    priceStatus: ResourceLedger['priceStatus']
    limits: {
      calls: number
      inputTokens: number
      outputTokens: number
      outputTokensPerCall: number
    }
  }
}

export interface PortableStyleMemory {
  schemaVersion: 1
  /** Legacy adapter-specific values remain importable so renames never strand user data. */
  product: 'liltloom' | 'dsh-liltloom' | 'dsh-style-memory'
  exportedAt: string
  preferences: PreferenceAtom[]
  exemplars: StyleExemplar[]
  selfDescription?: SelfDescription | undefined
}

export interface StyleQuery {
  register?: Register | undefined
  category?: PreferenceCategory | undefined
  workspace?: string | undefined
  status?: PreferenceStatus | undefined
  locked?: boolean | undefined
  text?: string | undefined
  limit?: number | undefined
}

export interface FeatureSample {
  register: Register
  text: string
  chars: number
  sentences: number
  paragraphs: number
  lines: number
  bulletLines: number
  headingLines: number
  emojiCount: number
  exclamationCount: number
  questionCount: number
  cjkPunctuationCount: number
  asciiPunctuationCount: number
  exemplarQuality: number
}
