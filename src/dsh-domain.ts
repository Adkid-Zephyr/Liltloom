/** DeepSeek Harness persistence adapter for Liltloom's portable domain. */

import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import {
  activationSchema,
  aggregateSchema,
  exemplarSchema,
  preferenceAtomSchema,
  profileMetaSchema,
  resourceLedgerSchema,
  selfDescriptionSchema,
  settingsSchema,
  watermarkSchema,
} from './schemas.js'
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
} from './types.js'

/** Durable DSH storage-domain declaration. Other adapters provide their own persistence binding. */
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
