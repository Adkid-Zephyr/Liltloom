# DEC-005 — Profile Topology

Status: Accepted

Accepted choice: C — global base plus workspace overlays

## Decision

General style evidence contributes to a global base profile. The same eligible message may also contribute to one workspace overlay identified by its canonical DSH session working directory.

Compilation merges the global base with the matching workspace overlay. Workspace preferences win conflicts within the same category and register; locked explicit global rules still outrank inferred overlay tendencies unless the user explicitly creates a conflicting locked workspace rule.

Portable export includes overlay records but strips machine-specific operational identifiers. Import may remap or discard workspace paths before commit.
