import { describe, expect, it } from 'vitest'
import {
  classifyRegister,
  containsLikelySecret,
  estimateTokens,
  extractFeatures,
  nativeProseEligibility,
} from '../src/features.js'

describe('deterministic style features', () => {
  it('classifies representative registers without retaining derived text', () => {
    expect(classifyRegister('这个 TypeScript 插件的 API 需要增加测试。')).toBe('technical')
    expect(classifyRegister('请确认项目交付方案，谢谢。')).toBe('professional')
    expect(classifyRegister('哈哈这个真的很棒 😀')).toBe('social')
    expect(classifyRegister('普通的一句话，没有特殊上下文。')).toBe('default')
  })

  it('rejects quoted, code, log, oversized, and secret-bearing sources', () => {
    expect(nativeProseEligibility('```ts\nconst secret = 1\n```').eligible).toBe(false)
    expect(nativeProseEligibility('> quoted one\n> quoted two\nown').eligible).toBe(false)
    expect(nativeProseEligibility('12:00:00 error\n12:00:01 error\nmy note').eligible).toBe(false)
    expect(nativeProseEligibility('x'.repeat(12001)).eligible).toBe(false)
    expect(containsLikelySecret('api_key = sk-this-is-a-secret-value')).toBe(true)
  })

  it('extracts bounded aggregate metrics and estimates CJK conservatively', () => {
    const sample = extractFeatures('先给结论。\n\n- 第一项\n- 第二项！')
    expect(sample.sentences).toBeGreaterThanOrEqual(2)
    expect(sample.paragraphs).toBe(2)
    expect(sample.bulletLines).toBe(2)
    expect(sample.cjkPunctuationCount).toBeGreaterThan(0)
    expect(estimateTokens('中文测试')).toBe(4)
    expect(estimateTokens('plain latin text')).toBeLessThan(15)
  })
})
