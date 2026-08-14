# Traceability Matrix

Status: MVP v1 complete

| Capability | Normative spec | Implementation | Verification |
|---|---|---|---|
| Quiet/source-bounded observation | `01`, `04`, `08` | `src/service.ts`, `src/features.ts` | `features.spec.ts`, service quiet/source tests |
| Idempotent persistence | `05`, `08` | `src/store.ts` watermarks, storage-domain | reload integration test |
| Deterministic learning | `01`, `02` | `src/features.ts`, `src/compiler.ts`, `src/store.ts` | feature/compiler tests |
| Editable preferences | `01`, `03` | service CRUD, `src/command.ts` | CRUD and command integration tests |
| Profile topology/precedence | `DEC-005`, `02` | profile scopes and `featureKey` overlay | compiler workspace test |
| Bounded compile/preview | `03` | `compileStyle()`, command `preview` | compiler budget test, command test |
| Activation and opt-out | `01`, `03`, `08` | activation table, dynamic context, inbox opt-out | activation/auto/opt-out tests |
| Optional model tool | `01`, `03` | `src/tool.ts`, dynamic registration | tool on/off integration test |
| Deep Style | `DEC-003`, `DEC-004`, `04` | exemplar store/quota/expiry and commands | Deep Style integration test |
| Small-model consolidation | `DEC-002`, `04` | `src/analyzer.ts`, resource policy in service/store | invalid proposal and failing-route tests |
| Minimal self context | `01`, `02`, `03` | self table, explicit compilation authorization | self integration tests |
| Export/import | `05` | portable Zod schema and store operations | round-trip/future-version test |
| Native client control plane | `03`, `06`, `08` | `src/client/*`, `src/rpc.ts`, `src/rpc-contract.ts` | client/RPC/package tests; real browser verification |
| Visual command and activation dock | `03`, `08` | command UI decorator and activation-only dock | production client build; real Web mount verification |
| Liltloom brand and progressive disclosure | `DEC-006` | compact native UI, lazy exemplars, in-page consent | real browser visual/interaction verification |
| Portable core and adapter boundary | `09`, `DEC-007` | `src/core.ts`, host-neutral schemas, `src/dsh-domain.ts` | core export/package tests |
| Executable contracts | `spec/schemas` | Zod durable schemas + JSON Schema | strict Ajv test |
| DSH adapter composition/lifecycle | `08`, `09` | bundle patch, Service init/disposal | real dump/boot evidence; integration teardown |

File paths in this matrix are repository-relative. `spec/verification.md` records the exact supported DSH target and release commands.
