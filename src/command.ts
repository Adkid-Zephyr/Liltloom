/** Human-facing `/liltloom` command with a legacy `/style-memory` alias. */

import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type StyleMemory from './service.js'
import type { Register } from './types.js'

const REGISTERS = new Set<Register>(['default', 'technical', 'professional', 'social', 'longform'])
const USAGE = 'Usage: /liltloom [status|list|add|edit|lock|unlock|suppress|restore|delete|exemplars|exemplar-lock|exemplar-unlock|exemplar-delete|preview|use|off|mode|tool|deep|analysis|pause|resume|self|self-use|self-clear|export|import|clear]'

function success(text: string): CommandResult {
  return { kind: 'success', text }
}

function failure(text: string): CommandResult {
  return { kind: 'error', text }
}

function renderStatus(service: StyleMemory): string {
  const status = service.status()
  const route = status.analysisRoute === undefined ? 'not configured' : `${status.analysisRoute.provider}/${status.analysisRoute.model}`
  return [
    'Liltloom / 语织',
    `Observation: ${status.settings.observationState}`,
    `Invocation: ${status.settings.invocationMode}`,
    `Model tool: ${status.settings.modelToolEnabled ? 'on' : 'off'}`,
    `Deep Style: ${status.settings.deepStyleEnabled ? 'on' : 'off'}`,
    `Analysis: ${status.settings.analysisEnabled ? 'on' : 'off'} (${route})`,
    `Learned messages: ${status.learnedMessages}`,
    `Preferences: ${status.preferences}`,
    `Exemplars: ${status.exemplars}`,
    `Profile revision: ${status.profileRevision}`,
  ].join('\n')
}

function parseRegister(value: string | undefined): Register | undefined {
  return value !== undefined && REGISTERS.has(value as Register) ? value as Register : undefined
}

function listPreferences(service: StyleMemory, register?: Register): CommandResult {
  const atoms = service.query({ ...(register === undefined ? {} : { register }), limit: 30 })
  if (atoms.length === 0) return success('No matching style preferences.')
  return success(atoms.map(atom => [
    `${atom.id} [${atom.register}/${atom.category}]`,
    `${atom.locked ? 'locked' : atom.status}; confidence ${atom.confidence.toFixed(2)}; evidence ${atom.evidenceCount}`,
    atom.statement,
  ].join(' — ')).join('\n'))
}

function listExemplars(service: StyleMemory, register?: Register): CommandResult {
  const exemplars = service.listExemplars(register).slice(0, 20)
  if (exemplars.length === 0) return success('No matching Deep Style excerpts.')
  return success(exemplars.map(exemplar => [
    `${exemplar.id} [${exemplar.register}; ${exemplar.locked ? 'locked' : `expires ${exemplar.expiresAt ?? 'never'}`}; quality ${exemplar.quality.toFixed(2)}]`,
    exemplar.text,
  ].join('\n')).join('\n\n'))
}

async function execute(service: StyleMemory, invocation: CommandInvocation): Promise<CommandResult> {
  const input = invocation.rawInput.trim()
  if (input.length === 0 || input === 'status') return success(renderStatus(service))
  if (input === 'help') return success(USAGE)
  const firstSpace = input.indexOf(' ')
  const action = (firstSpace < 0 ? input : input.slice(0, firstSpace)).toLocaleLowerCase()
  const rest = firstSpace < 0 ? '' : input.slice(firstSpace + 1).trim()

  try {
    switch (action) {
      case 'list': return listPreferences(service, parseRegister(rest || undefined))
      case 'add': {
        const match = /^\[([a-z-]+)\]\s+([\s\S]+)$/u.exec(rest)
        const register = parseRegister(match?.[1]) ?? 'default'
        const statement = match?.[2] ?? rest
        const atom = await service.addPreference(statement, register)
        return success(`Added and locked ${atom.id}: ${atom.statement}`)
      }
      case 'edit': {
        const match = /^(\S+)\s+([\s\S]+)$/u.exec(rest)
        if (match?.[1] === undefined || match[2] === undefined) return failure(`Edit requires an id and replacement text.\n${USAGE}`)
        const atom = await service.editPreference(match[1], match[2])
        return success(`Updated and locked ${atom.id}: ${atom.statement}`)
      }
      case 'lock':
      case 'unlock': {
        if (rest.length === 0) return failure(`${action} requires a preference id.`)
        const atom = await service.setPreferenceState(rest, { locked: action === 'lock' })
        return success(`${atom.id} is now ${atom.locked ? 'locked' : 'unlocked'}.`)
      }
      case 'suppress':
      case 'restore': {
        if (rest.length === 0) return failure(`${action} requires a preference id.`)
        const atom = await service.setPreferenceState(rest, { status: action === 'suppress' ? 'suppressed' : 'active' })
        return success(`${atom.id} is now ${atom.status}.`)
      }
      case 'delete':
        if (rest.length === 0) return failure('delete requires a preference id.')
        return success(await service.deletePreference(rest) ? `Deleted ${rest}.` : `Preference ${rest} was not found.`)
      case 'exemplars': return listExemplars(service, parseRegister(rest || undefined))
      case 'exemplar-lock':
      case 'exemplar-unlock': {
        if (rest.length === 0) return failure(`${action} requires an excerpt id.`)
        const exemplar = await service.setExemplarState(rest, action === 'exemplar-lock')
        return success(`${exemplar.id} is now ${exemplar.locked ? 'locked with no automatic expiry' : `unlocked and expires ${exemplar.expiresAt}`}.`)
      }
      case 'exemplar-delete':
        if (rest.length === 0) return failure('exemplar-delete requires an excerpt id.')
        return success(await service.deleteExemplar(rest) ? `Deleted excerpt ${rest}.` : `Excerpt ${rest} was not found.`)
      case 'preview': {
        const parts = rest.split(/\s+/u).filter(Boolean)
        const register = parseRegister(parts[0]) ?? 'default'
        const packet = service.compile({
          register,
          depth: parts.includes('deep') ? 'deep' : 'basic',
          includeSelfContext: parts.includes('self'),
          ...(invocation.agent.session.header.cwd === undefined ? {} : { workspace: invocation.agent.session.header.cwd }),
        })
        return success([
          `Profile revision ${packet.profileRevision}; ${packet.estimatedTokens}/${packet.tokenBudget} estimated tokens; ${packet.selectedPreferenceIds.length} preferences.`,
          packet.renderedContext,
        ].join('\n\n'))
      }
      case 'use': {
        const parts = rest.split(/\s+/u).filter(Boolean)
        const register = parseRegister(parts[0]) ?? 'default'
        const scope = parts.includes('session') ? 'session' : 'next-response'
        const activation = await service.activate(invocation.agent.session, {
          register,
          depth: service.getSettings().deepStyleEnabled ? 'deep' : 'basic',
          includeSelfContext: parts.includes('self'),
        }, scope)
        return success(`Activated ${activation.packet.selectedPreferenceIds.length} preferences for ${scope}.`)
      }
      case 'off':
        return success(await service.deactivate(String(invocation.agent.session.id)) ? 'Style activation removed.' : 'No active style context.')
      case 'mode': {
        if (rest === 'explicit' || rest === 'disabled') {
          await service.updateSettings({ invocationMode: rest })
          return success(`Invocation mode set to ${rest}.`)
        }
        if (rest === 'auto') {
          const workspace = invocation.agent.session.header.cwd
          if (workspace === undefined) return failure('Automatic mode requires a session workspace.')
          const globs = [...new Set([...service.getSettings().autoWorkspaceGlobs, workspace])]
          await service.updateSettings({ invocationMode: 'configured-auto', autoWorkspaceGlobs: globs })
          return success(`Automatic style use enabled only for ${workspace}.`)
        }
        return failure('mode must be explicit, auto, or disabled.')
      }
      case 'tool':
        if (rest !== 'on' && rest !== 'off') return failure('tool must be on or off.')
        await service.updateSettings({ modelToolEnabled: rest === 'on' })
        return success(`Model-facing style_context tool ${rest}.`)
      case 'deep':
        if (rest === 'on') {
          await service.updateSettings({ deepStyleEnabled: true })
          return success('Deep Style enabled: eligible user-authored excerpts may be retained. They expire after 90 days, with at most 200 records and 240,000 characters; inspect them with /liltloom exemplars.')
        }
        if (rest === 'off keep') {
          await service.updateSettings({ deepStyleEnabled: false })
          return success('Deep Style disabled. Existing excerpts remain until expiry or manual deletion.')
        }
        if (rest === 'off delete') {
          await service.updateSettings({ deepStyleEnabled: false })
          const removed = await service.deleteAllExemplars()
          return success(`Deep Style disabled and ${removed} stored excerpts deleted.`)
        }
        return failure('Choose whether retained excerpts survive: deep on, deep off keep, or deep off delete.')
      case 'analysis':
        if (rest !== 'on' && rest !== 'off') return failure('analysis must be on or off.')
        await service.updateSettings({ analysisEnabled: rest === 'on' })
        return success(`Small-model analysis ${rest}.`)
      case 'pause':
        await service.updateSettings({ observationState: 'paused' })
        return success('Style observation paused; existing memory is unchanged.')
      case 'resume':
        await service.updateSettings({ observationState: 'learning' })
        return success('Style observation resumed.')
      case 'self':
        if (rest.length === 0) {
          const description = service.getSelfDescription()
          return success(description === undefined ? 'No self description.' : description.text)
        }
        await service.setSelfDescription(rest)
        return success('Self description saved as user-authored source text.')
      case 'self-use':
        if (rest !== 'on' && rest !== 'off') return failure('self-use must be on or off.')
        await service.updateSettings({ allowSelfContextInCompilation: rest === 'on' })
        return success(`Use of self description in compiled style context ${rest}. The description remains separately stored.`)
      case 'self-clear':
        return success(await service.deleteSelfDescription() ? 'Self description deleted.' : 'No self description.')
      case 'export': return success(JSON.stringify(service.exportData(), null, 2))
      case 'import':
      case 'import-replace': {
        if (rest.length === 0) return failure(`${action} requires a JSON export document.`)
        await service.importData(JSON.parse(rest), action === 'import' ? 'merge' : 'replace')
        return success(`Import ${action === 'import' ? 'merged' : 'replaced'} successfully.`)
      }
      case 'clear':
        if (rest !== 'confirm') return failure('Permanent deletion requires: /liltloom clear confirm')
        await service.clearUserData()
        return success('Deleted preferences, aggregates, exemplars, activations, self description, and processing watermarks. Operational resource accounting remains.')
      default: return failure(USAGE)
    }
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error))
  }
}

/** Register the direct human command without sending its input to the model. */
export function installStyleMemoryCommand(ctx: Context, service: StyleMemory): void {
  for (const command of [
    { name: 'liltloom', description: 'inspect and control Liltloom personal writing style' },
    { name: 'style-memory', description: 'legacy alias for /liltloom' },
  ]) {
    ctx.commands.register({
      ...command,
      input: { hint: '[status|list|add|edit|exemplars|preview|use|mode|tool|deep|analysis|self|self-use|export|import|clear]' },
      recordInput: false,
      handler: invocation => execute(service, invocation),
    })
  }
}
