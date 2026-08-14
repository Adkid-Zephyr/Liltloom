/** Deterministic aggregate-to-preference derivation and bounded context compilation. */

import type {
  DerivedSelfContext,
  EvidenceAggregate,
  PreferenceAtom,
  PreferenceCategory,
  ProfileScope,
  Register,
  SelfDescription,
  StyleContextPacket,
  StyleExemplar,
} from './types.js'
import { estimateTokens, fingerprint } from './features.js'

interface DerivedRule {
  featureKey: string
  category: PreferenceCategory
  statement: string
  confidence: number
}
/** Convert accumulated metrics into stable, inspectable inferred rules. */
export function deriveRules(aggregate: EvidenceAggregate): DerivedRule[] {
  if (aggregate.sampleCount < 3) return []
  const n = aggregate.sampleCount
  const confidence = Math.min(0.92, 0.45 + Math.log2(n + 1) * 0.1)
  const averageChars = aggregate.totalChars / n
  const averageSentenceChars = aggregate.totalChars / Math.max(1, aggregate.totalSentences)
  const paragraphs = aggregate.totalParagraphs / n
  const bulletRatio = aggregate.bulletLines / Math.max(1, aggregate.totalLines)
  const punctuation = aggregate.cjkPunctuationCount + aggregate.asciiPunctuationCount
  const rules: DerivedRule[] = []

  if (averageChars < 140) rules.push({ featureKey: 'verbosity:message-length', category: 'verbosity', statement: '默认表达偏简洁，先给结论，避免无必要铺陈。', confidence })
  else if (averageChars > 420) rules.push({ featureKey: 'verbosity:message-length', category: 'verbosity', statement: '允许较充分展开观点，但保持每一段有明确作用。', confidence })

  if (averageSentenceChars < 34) rules.push({ featureKey: 'rhythm:sentence-length', category: 'sentence-rhythm', statement: '多用短句和直接句式，控制单句负担。', confidence })
  else if (averageSentenceChars > 70) rules.push({ featureKey: 'rhythm:sentence-length', category: 'sentence-rhythm', statement: '可使用信息密度较高的长句，但逻辑关系要清楚。', confidence })

  if (paragraphs >= 1.8) rules.push({ featureKey: 'structure:paragraphing', category: 'structure', statement: '使用自然分段组织推进关系，不把所有内容挤在一个段落。', confidence })
  if (bulletRatio >= 0.14) rules.push({ featureKey: 'formatting:lists', category: 'formatting', statement: '并列信息适合使用列表，列表项保持短而同构。', confidence })
  if (aggregate.headingLines / Math.max(1, aggregate.totalLines) >= 0.05) rules.push({ featureKey: 'formatting:headings', category: 'formatting', statement: '较长内容使用少量描述性标题分层。', confidence })

  if (aggregate.emojiCount / n >= 0.35) rules.push({ featureKey: 'tone:emoji', category: 'tone', statement: '轻松语境可以少量使用表情，使语气更自然。', confidence: Math.min(confidence, 0.82) })
  if (n >= 8 && aggregate.exclamationCount / n < 0.15) rules.push({ featureKey: 'tone:exclamation', category: 'avoidance', statement: '避免频繁使用感叹号或过度兴奋的语气。', confidence: Math.min(confidence, 0.78) })
  if (punctuation >= 12 && aggregate.cjkPunctuationCount / punctuation >= 0.8) rules.push({ featureKey: 'formatting:cjk-punctuation', category: 'formatting', statement: '中文内容优先使用全角中文标点。', confidence })
  return rules
}

/** Stable inferred preference id for one profile scope, register, and feature. */
export function inferredPreferenceId(scope: ProfileScope, register: Register, featureKey: string): string {
  const scopeName = scope.kind === 'global' ? 'global' : `workspace:${fingerprint(scope.workspace).slice(0, 16)}`
  return `inferred:${scopeName}:${register}:${featureKey}`
}

/** Materialize one derived rule as a durable preference atom. */
export function materializeRule(
  scope: ProfileScope,
  register: Register,
  aggregate: EvidenceAggregate,
  rule: DerivedRule,
  previous?: PreferenceAtom,
): PreferenceAtom {
  const now = aggregate.lastObservedAt
  return {
    id: inferredPreferenceId(scope, register, rule.featureKey),
    revision: (previous?.revision ?? 0) + 1,
    profileScope: scope,
    featureKey: rule.featureKey,
    category: rule.category,
    register,
    statement: rule.statement,
    sourceClass: aggregate.sampleCount >= 8 ? 'strong-observation' : 'weak-observation',
    confidence: rule.confidence,
    evidenceCount: aggregate.sampleCount,
    status: previous?.status ?? 'active',
    locked: previous?.locked ?? false,
    firstSeenAt: previous?.firstSeenAt ?? now,
    lastSeenAt: now,
  }
}

function priority(atom: PreferenceAtom): number {
  const source = atom.sourceClass === 'user-explicit' ? 100
    : atom.sourceClass === 'user-revision' ? 80
      : atom.sourceClass === 'strong-observation' ? 50 : 30
  const scope = atom.profileScope.kind === 'workspace' ? 15 : 0
  return (atom.locked ? 1000 : 0) + source + scope + atom.confidence
}

function activeExemplars(exemplars: readonly StyleExemplar[], workspace: string | undefined, register: Register): StyleExemplar[] {
  const now = Date.now()
  return exemplars
    .filter(item => item.status === 'active' && (item.expiresAt === null || Date.parse(item.expiresAt) > now))
    .filter(item => item.register === register || item.register === 'default')
    .filter(item => item.profileScope.kind === 'global' || item.profileScope.workspace === workspace)
    .sort((a, b) => Number(b.locked) - Number(a.locked) || b.quality - a.quality || b.createdAt.localeCompare(a.createdAt))
}

/** Derive a minimal self-context view without inferring personality from conversation. */
export function deriveSelfContext(description: SelfDescription): DerivedSelfContext {
  const statements = description.text.split(/[。！？!?\n]+/u).map(value => value.trim()).filter(Boolean).slice(0, 12)
  return {
    sourceRevision: description.revision,
    traits: statements.slice(0, 4),
    communicationPreferences: statements.slice(4, 8),
    values: statements.slice(8, 12),
    derivedAt: description.updatedAt,
  }
}

export interface CompileInput {
  profileRevision: number
  preferences: readonly PreferenceAtom[]
  exemplars: readonly StyleExemplar[]
  selfDescription?: SelfDescription
  register: Register
  workspace?: string
  purpose: StyleContextPacket['purpose']
  depth: 'basic' | 'deep'
  budgetTokens: number
  includeSelfContext: boolean
  selectedPreferenceIds?: readonly string[]
}

/** Compile one deterministic, token-bounded runtime projection. */
export function compileStyle(input: CompileInput): StyleContextPacket {
  const selected = input.preferences
    .filter(atom => atom.status === 'active')
    .filter(atom => atom.register === input.register || atom.register === 'default')
    .filter(atom => atom.profileScope.kind === 'global' || atom.profileScope.workspace === input.workspace)
    .filter(atom => input.selectedPreferenceIds === undefined || input.selectedPreferenceIds.includes(atom.id))
    .sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id))

  const byFeature = new Map<string, PreferenceAtom>()
  const manual: PreferenceAtom[] = []
  for (const atom of selected) {
    if (atom.sourceClass === 'user-explicit' || atom.featureKey.startsWith('manual:')) manual.push(atom)
    else if (!byFeature.has(atom.featureKey)) byFeature.set(atom.featureKey, atom)
  }
  const ordered = [...manual, ...byFeature.values()].sort((a, b) => priority(b) - priority(a) || a.id.localeCompare(b.id))
  const rules: string[] = []
  const avoid: string[] = []
  const ids: string[] = []
  const header = '用户已授权的写作风格参考。当前任务指令、事实准确性和安全要求始终优先。'
  let rendered = header
  for (const atom of ordered) {
    const target = atom.category === 'avoidance' ? avoid : rules
    const candidate = `${rendered}\n- ${atom.statement}`
    if (estimateTokens(candidate) > input.budgetTokens) continue
    target.push(atom.statement)
    ids.push(atom.id)
    rendered = candidate
  }

  const chosenExemplars: StyleExemplar[] = []
  if (input.depth === 'deep') {
    for (const exemplar of activeExemplars(input.exemplars, input.workspace, input.register).slice(0, 3)) {
      const candidate = `${rendered}\n\n风格示例：\n${exemplar.text}`
      if (estimateTokens(candidate) > input.budgetTokens) continue
      chosenExemplars.push(exemplar)
      rendered = candidate
    }
  }

  const selfContext = input.includeSelfContext && input.selfDescription !== undefined
    ? deriveSelfContext(input.selfDescription) : undefined
  if (selfContext !== undefined) {
    const candidate = `${rendered}\n\n用户自述参考：${input.selfDescription?.text ?? ''}`
    if (estimateTokens(candidate) <= input.budgetTokens) rendered = candidate
  }

  const confidence = ordered.length === 0 ? 0 : ordered.reduce((sum, atom) => sum + atom.confidence, 0) / ordered.length
  return {
    schemaVersion: 1,
    profileRevision: input.profileRevision,
    register: input.register,
    purpose: input.purpose,
    selectedPreferenceIds: ids,
    rules,
    avoid,
    ...(chosenExemplars.length === 0 ? {} : { exemplars: chosenExemplars }),
    ...(selfContext === undefined ? {} : { selfContext }),
    confidence,
    tokenBudget: input.budgetTokens,
    estimatedTokens: estimateTokens(rendered),
    renderedContext: rendered,
  }
}
