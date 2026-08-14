import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { Ajv2020 } from 'ajv/dist/2020.js'
import type { FormatsPlugin } from 'ajv-formats'
import { analysisProposalSchema } from '../src/schemas.js'

const schemaRoot = fileURLToPath(new URL('../spec/schemas/', import.meta.url))
const addFormats = createRequire(import.meta.url)('ajv-formats') as FormatsPlugin

describe('public JSON Schema contracts', () => {
  it('all compile together in strict JSON Schema 2020-12 mode', async () => {
    const names = (await readdir(schemaRoot)).filter(name => name.endsWith('.schema.json')).sort()
    expect(names).toHaveLength(11)
    const schemas = await Promise.all(names.map(async name => JSON.parse(await readFile(join(schemaRoot, name), 'utf8')) as object))
    const ajv = new Ajv2020({ strict: true, allErrors: true })
    addFormats(ajv)
    for (const schema of schemas) ajv.addSchema(schema)
    for (const schema of schemas as Array<{ $id: string }>) expect(ajv.getSchema(schema.$id)).toBeDefined()
  })

  it('rejects malformed or overconfident small-model proposals before mutation', () => {
    expect(() => analysisProposalSchema.parse({
      observations: [{ category: 'tone', register: 'default', statement: 'x', confidence: 0.95 }],
    })).toThrow()
    expect(() => analysisProposalSchema.parse({ observations: [{ statement: 'missing fields' }] })).toThrow()
  })
})
