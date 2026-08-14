/** Deterministic eligibility, register classification, and style feature extraction. */

import { createHash } from 'node:crypto'
import type { FeatureSample, Register } from './types.js'

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\b(?:sk|pk|api)[-_][A-Za-z0-9_-]{16,}\b/u,
  /\bBearer\s+[A-Za-z0-9._~-]{12,}\b/iu,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/u,
  /(?:api[_-]?key|secret|password)\s*[:=]\s*\S{8,}/iu,
]

const TECHNICAL = /(?:\b(?:API|JSON|TypeScript|JavaScript|Python|SQL|HTTP|SDK|CLI|bug|code|function|class|database)\b|接口|代码|函数|模型|数据库|插件|编译|测试)/iu
const PROFESSIONAL = /(?:方案|项目|需求|交付|会议|客户|请确认|谢谢|Regards|proposal|roadmap|stakeholder|deadline)/iu
const SOCIAL = /(?:哈哈|嘿嘿|笑死|太棒了|hhh|lol|[😀-🙏])/u
const EMOJI = /\p{Extended_Pictographic}/gu

/** Stable SHA-256 hexadecimal fingerprint. */
export function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
/** Return the textual body of a user message, or undefined for mixed non-text input. */
export function textFromBlocks(blocks: readonly { type: string; text?: string }[]): string | undefined {
  if (blocks.length === 0 || blocks.some(block => block.type !== 'text' || typeof block.text !== 'string')) return undefined
  const text = blocks.map(block => block.text ?? '').join('\n').trim()
  return text.length === 0 ? undefined : text
}

/** Detect material that must never enter Deep Style or remote analysis. */
export function containsLikelySecret(text: string): boolean {
  return SECRET_PATTERNS.some(pattern => pattern.test(text))
}

/** Reject text that is likely quoted, pasted, generated, code, or logs rather than native prose. */
export function nativeProseEligibility(text: string, maxChars = 12_000): { eligible: boolean; reason?: string } {
  if (text.length < 12) return { eligible: false, reason: 'too-short' }
  if (text.length > maxChars) return { eligible: false, reason: 'too-long' }
  const lines = text.split(/\r?\n/u)
  const nonblank = lines.filter(line => line.trim().length > 0)
  if (nonblank.length === 0) return { eligible: false, reason: 'empty' }
  const quoted = nonblank.filter(line => /^\s*>/u.test(line)).length / nonblank.length
  const code = nonblank.filter(line => /^\s*(?:```|~~~|\$ |[A-Za-z]:\\|\w+\s*[=:]\s*[{[])/u.test(line)).length / nonblank.length
  const log = nonblank.filter(line => /^(?:\[?\d{2}:\d{2}:\d{2}|\w+Error:|at \S+ \(|(?:INFO|WARN|ERROR)\b)/u.test(line.trim())).length / nonblank.length
  if (text.includes('```') || text.includes('~~~')) return { eligible: false, reason: 'code-fence' }
  if (quoted >= 0.35) return { eligible: false, reason: 'quoted' }
  if (code >= 0.35) return { eligible: false, reason: 'code-like' }
  if (log >= 0.25) return { eligible: false, reason: 'log-like' }
  return { eligible: true }
}

/** Infer a coarse writing register from the current sample only. */
export function classifyRegister(text: string): Register {
  if (text.length >= 800) return 'longform'
  if (TECHNICAL.test(text)) return 'technical'
  if (PROFESSIONAL.test(text)) return 'professional'
  if (SOCIAL.test(text)) return 'social'
  return 'default'
}

/** Extract compact non-reconstructive metrics from eligible prose. */
export function extractFeatures(text: string): FeatureSample {
  const lines = text.split(/\r?\n/u)
  const nonblank = lines.filter(line => line.trim().length > 0)
  const sentenceParts = text.split(/[。！？!?；;\.]+/u).filter(part => part.trim().length > 0)
  const paragraphs = text.split(/\n\s*\n/u).filter(part => part.trim().length > 0)
  const bulletLines = nonblank.filter(line => /^\s*(?:[-*+] |\d+[.)、]\s*)/u.test(line)).length
  const headingLines = nonblank.filter(line => /^\s{0,3}#{1,6}\s+/u.test(line)).length
  const emojiCount = [...text.matchAll(EMOJI)].length
  const exclamationCount = [...text.matchAll(/[！!]/gu)].length
  const questionCount = [...text.matchAll(/[？?]/gu)].length
  const cjkPunctuationCount = [...text.matchAll(/[，。；：！？、“”‘’（）【】]/gu)].length
  const asciiPunctuationCount = [...text.matchAll(/[,.;:!?"'()[\]]/gu)].length
  const sentenceDensity = Math.min(1, sentenceParts.length / Math.max(1, text.length / 80))
  const paragraphScore = Math.min(1, paragraphs.length / Math.max(1, text.length / 300))
  const exemplarQuality = Math.max(0, Math.min(1,
    0.35 + Math.min(text.length, 500) / 1000 + sentenceDensity * 0.15 + paragraphScore * 0.1
    - (bulletLines > nonblank.length / 2 ? 0.25 : 0),
  ))
  return {
    register: classifyRegister(text),
    text,
    chars: text.length,
    sentences: Math.max(1, sentenceParts.length),
    paragraphs: Math.max(1, paragraphs.length),
    lines: Math.max(1, nonblank.length),
    bulletLines,
    headingLines,
    emojiCount,
    exclamationCount,
    questionCount,
    cjkPunctuationCount,
    asciiPunctuationCount,
    exemplarQuality,
  }
}

/** Conservative mixed CJK/Latin token estimate used only to enforce an upper bound. */
export function estimateTokens(text: string): number {
  let units = 0
  for (const character of text) {
    if (/\s/u.test(character)) units += 0.1
    else if (/\p{Script=Han}/u.test(character)) units += 1
    else units += 0.3
  }
  return Math.ceil(units)
}
