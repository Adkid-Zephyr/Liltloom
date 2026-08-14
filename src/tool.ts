/** Optional model-facing consumer of the shared style-memory service. */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type StyleMemory from './service.js'
import type { Register } from './types.js'

const REGISTERS: Register[] = ['default', 'technical', 'professional', 'social', 'longform']

/** Register the policy-enforced read-only `style_context` tool. */
export function installStyleContextTool(ctx: Context, service: StyleMemory): () => void {
  return ctx.tools.register(defineTool({
    name: 'style_context',
    description: 'Retrieve the user-authorized writing-style context for the current task. Use only when the user explicitly asks for their own style, unless configured automatic use is active.',
    parameters: {
      register: {
        type: 'string',
        enum: REGISTERS,
        description: 'Writing register. Defaults to default.',
      },
      depth: {
        type: 'string',
        enum: ['basic', 'deep'],
        description: 'basic uses structured preferences; deep may add retained exemplars when enabled.',
      },
      includeSelfContext: {
        type: 'boolean',
        description: 'Include the separately authorized self-description reference.',
      },
      budgetTokens: {
        type: 'integer',
        description: 'Maximum approximate tokens in the returned style context.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          profileRevision: { type: 'integer', required: true },
          register: { type: 'string', required: true, enum: REGISTERS },
          selectedPreferenceIds: { type: 'array', required: true, items: { type: 'string' } },
          rules: { type: 'array', required: true, items: { type: 'string' } },
          avoid: { type: 'array', required: true, items: { type: 'string' } },
          renderedContext: { type: 'string', required: true },
          estimatedTokens: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.renderedContext }],
    },
    execute(args, execution) {
      const agent = execution.agent
      if (agent === undefined) throw new Error('style_context requires an owning Agent session')
      const settings = service.getSettings()
      if (settings.invocationMode === 'disabled') throw new Error('STYLE_DISABLED')
      if (settings.invocationMode === 'explicit' && !service.hasExplicitRequest(agent)) {
        throw new Error('STYLE_NOT_EXPLICITLY_REQUESTED')
      }
      const packet = service.compile({
        register: (args.register ?? 'default') as Register,
        depth: (args.depth ?? 'basic') as 'basic' | 'deep',
        includeSelfContext: args.includeSelfContext ?? false,
        ...(args.budgetTokens === undefined ? {} : { budgetTokens: args.budgetTokens }),
        ...(agent.session.header.cwd === undefined ? {} : { workspace: agent.session.header.cwd }),
      })
      return Promise.resolve({
        profileRevision: packet.profileRevision,
        register: packet.register,
        selectedPreferenceIds: packet.selectedPreferenceIds,
        rules: packet.rules,
        avoid: packet.avoid,
        renderedContext: packet.renderedContext,
        estimatedTokens: packet.estimatedTokens,
      })
    },
    presentCall: args => ({ card: 'generic', title: 'Retrieve personal writing style', kind: 'search', rawInput: args }),
  }))
}
