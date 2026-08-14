/** Optional bounded small-model semantic consolidation. */

import type { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { analysisProposalSchema } from './schemas.js'
import type { PreferenceAtom, Register } from './types.js'

export interface AnalysisRoute {
  provider: string
  model: string
  maxOutputTokens: number
}

export interface AnalysisObservation {
  category: PreferenceAtom['category']
  register: Register
  statement: string
  confidence: number
}

export interface AnalysisResult {
  observations: AnalysisObservation[]
  usage?: TokenUsage
}

const SYSTEM = `You extract reusable writing-style preferences from user-authored prose.
Return JSON only: {"observations":[{"category":"tone|verbosity|structure|sentence-rhythm|vocabulary|formatting|avoidance","register":"default|technical|professional|social|longform","statement":"a concise actionable style rule in the prose language","confidence":0.0}]}
Do not infer identity, personality, beliefs, private facts, or factual memory. Do not quote source sentences. Return at most 8 observations.`

function textOutput(assembler: BlockAssembler): string {
  const finish = assembler.finish
  if (finish.kind === 'error' || finish.kind === 'aborted') throw new Error(finish.failure.message)
  return assembler.blocks()
    .filter((block): block is Extract<ReturnType<BlockAssembler['blocks']>[number], { type: 'text' }> => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()
}

function parseJson(text: string): unknown {
  const unfenced = text.replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('analysis model returned no JSON object')
  return JSON.parse(unfenced.slice(start, end + 1))
}

/** Run one hand-built, non-agent analysis call and validate the proposal. */
export async function analyzeStyle(
  ctx: Context,
  route: AnalysisRoute,
  samples: readonly string[],
  signal: AbortSignal,
): Promise<AnalysisResult> {
  const framed = samples.map((sample, index) => `<sample index="${index + 1}">\n${sample}\n</sample>`).join('\n\n')
  const message = createUserMessage({
    content: [{ type: 'text', text: framed }],
    source: { kind: 'plugin', plugin: 'dsh-liltloom' },
  })
  const assembler = new BlockAssembler()
  for await (const chunk of ctx.llm.stream({
    provider: route.provider,
    model: route.model,
    messages: [message],
    system: SYSTEM,
    maxTokens: route.maxOutputTokens,
    signal,
  })) assembler.push(chunk)
  const parsed = analysisProposalSchema.parse(parseJson(textOutput(assembler)))
  const observations = parsed.observations.filter(observation => observation.category !== 'explicit-rule')
  return { observations, ...(assembler.usage === undefined ? {} : { usage: assembler.usage }) }
}
