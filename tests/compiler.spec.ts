import { describe, expect, it } from 'vitest'
import { compileStyle, deriveRules } from '../src/compiler.js'
import type { EvidenceAggregate, PreferenceAtom } from '../src/types.js'

const now = '2026-08-14T00:00:00.000Z'

function aggregate(samples: number): EvidenceAggregate {
  return {
    id: 'global:default',
    profileScope: { kind: 'global' },
    register: 'default',
    sampleCount: samples,
    totalChars: samples * 80,
    totalSentences: samples * 4,
    totalParagraphs: samples * 2,
    totalLines: samples * 4,
    bulletLines: samples,
    headingLines: 0,
    emojiCount: 0,
    exclamationCount: 0,
    questionCount: 0,
    cjkPunctuationCount: samples * 8,
    asciiPunctuationCount: 0,
    firstObservedAt: now,
    lastObservedAt: now,
  }
}

function atom(overrides: Partial<PreferenceAtom>): PreferenceAtom {
  return {
    id: 'global-rule',
    revision: 1,
    profileScope: { kind: 'global' },
    featureKey: 'verbosity:message-length',
    category: 'verbosity',
    register: 'default',
    statement: 'Global inferred rule.',
    sourceClass: 'strong-observation',
    confidence: 0.8,
    evidenceCount: 10,
    status: 'active',
    locked: false,
    firstSeenAt: now,
    lastSeenAt: now,
    ...overrides,
  }
}

describe('style compiler', () => {
  it('waits for repeated evidence before deriving rules', () => {
    expect(deriveRules(aggregate(2))).toEqual([])
    expect(deriveRules(aggregate(8)).length).toBeGreaterThan(1)
  })

  it('lets a workspace overlay replace the same inferred feature', () => {
    const packet = compileStyle({
      profileRevision: 2,
      preferences: [
        atom({}),
        atom({ id: 'workspace-rule', profileScope: { kind: 'workspace', workspace: '/work' }, statement: 'Workspace rule.' }),
      ],
      exemplars: [],
      register: 'default',
      workspace: '/work',
      purpose: 'imitate',
      depth: 'basic',
      budgetTokens: 200,
      includeSelfContext: false,
    })
    expect(packet.rules).toEqual(['Workspace rule.'])
    expect(packet.selectedPreferenceIds).toEqual(['workspace-rule'])
  })

  it('keeps locked explicit rules ahead of inferred overlays and enforces the budget', () => {
    const explicit = atom({
      id: 'manual',
      featureKey: 'manual:1',
      category: 'explicit-rule',
      statement: 'Always keep this user rule.',
      sourceClass: 'user-explicit',
      locked: true,
      confidence: 1,
    })
    const packet = compileStyle({
      profileRevision: 2,
      preferences: [explicit, atom({ id: 'long', statement: 'x'.repeat(1000) })],
      exemplars: [],
      register: 'default',
      purpose: 'imitate',
      depth: 'basic',
      budgetTokens: 80,
      includeSelfContext: false,
    })
    expect(packet.selectedPreferenceIds).toContain('manual')
    expect(packet.estimatedTokens).toBeLessThanOrEqual(80)
    expect(packet.renderedContext).toContain('当前任务指令')
  })
})
