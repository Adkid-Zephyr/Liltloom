# Portable core and host adapters

Status: Normative for v0.2
Decision: `decisions/DEC-007-portable-core-first-adapter.md`

## Product boundary

Liltloom owns the personal style model and its portable protocol. A host adapter owns runtime-specific observation, storage binding, authorization surfaces, context delivery, and user interface.

The canonical contract consists of:

1. eligible user-authored text as observation input;
2. structured `PreferenceAtom`, optional `StyleExemplar`, and user-authored self-description records;
3. versioned `PortableStyleMemory` export/import;
4. bounded `StyleContextPacket` output;
5. explicit authorization and opt-out precedence.

No host-specific session ID, filesystem layout, prompt-hook name, or tool protocol is part of the portable export.

## Core export

`liltloom/core` MUST load without importing any DeepSeek Harness runtime package. It exports:

- public and durable TypeScript vocabulary;
- Zod schemas for portable records and requests;
- native-prose eligibility and secret screening;
- deterministic feature extraction and rule derivation;
- self-context derivation and bounded Style Context compilation.

Persistence orchestration and host event subscription deliberately stay outside the core export.

## Adapter obligations

A conforming adapter MUST:

- distinguish human-authored input from assistant, tool, plugin, quoted, pasted, generated, and sub-agent material;
- preserve the base-mode promise not to store full raw messages;
- expose visible inspect, edit, export, import, pause, and delete controls;
- keep Deep Style and remote model analysis as separate informed opt-ins;
- make ordinary requests unchanged until activation is authorized;
- inject only a bounded, replayable Style Context Packet;
- honor current-message opt-out above every stored rule or activation;
- migrate the portable format without coupling it to host-local operational state.

## Maintained adapters

| Adapter | Status | Entry point |
|---|---|---|
| DeepSeek Harness Web | Maintained; compatibility tested against `0.1.0-rc.5..rc.6` | package root or `liltloom/adapters/dsh` |

Other adapters are roadmap candidates, not current compatibility claims.
