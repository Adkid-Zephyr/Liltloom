import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('DSH package manifest', () => {
  it('exposes package metadata and the browser bundle for client-modules discovery', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      name: string
      exports: Record<string, unknown>
      dsh: { client?: { platform?: string; inject?: unknown[] } }
    }
    expect(manifest.name).toBe('dsh-liltloom')
    expect(manifest.exports['./package.json']).toBe('./package.json')
    expect(manifest.exports['./client']).toMatchObject({ default: './lib/client.js' })
    expect(manifest.dsh.client).toMatchObject({ platform: 'web' })
    expect(manifest.dsh.client?.inject).toContain('@deepseek-ai/dsh-client-ui-settings-plugins')
  })
})
