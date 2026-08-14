import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Liltloom package manifest', () => {
  it('exposes the portable core and the DSH browser adapter', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      name: string
      exports: Record<string, unknown>
      dsh: { client?: { platform?: string; inject?: unknown[] } }
    }
    expect(manifest.name).toBe('liltloom')
    expect(manifest.exports['./package.json']).toBe('./package.json')
    expect(manifest.exports['./core']).toMatchObject({ default: './lib/core.js' })
    expect(manifest.exports['./adapters/dsh']).toMatchObject({ default: './lib/index.js' })
    expect(manifest.exports['./client']).toMatchObject({ default: './lib/client.js' })
    expect(manifest.dsh.client).toMatchObject({ platform: 'web' })
    expect(manifest.dsh.client?.inject).toContain('@deepseek-ai/dsh-client-ui-settings-plugins')
  })

  it('loads the framework-neutral core surface directly', async () => {
    const core = await import('../src/core.js')
    expect(core.nativeProseEligibility).toBeTypeOf('function')
    expect(core.extractFeatures).toBeTypeOf('function')
    expect(core.compileStyle).toBeTypeOf('function')
    expect(core.portableStyleMemorySchema).toBeDefined()
  })
})
