# schema — the source of truth

**The schema defines the format. `spec/*.md` explains it. Where they disagree, the schema wins and
the prose is a bug.**

## Not written yet

The first schema task is to express `spec/01-data-model.md` as something machine-checkable, then
make all four `fixtures/legacy/` documents validate against it. **The legacy documents predate the
spec and will not all validate cleanly — that is the point.** Where they fail is exactly where the
schema drifted, and each failure is either a schema gap or a documented migration.

## Why this matters more than usual here

Prose specs drift from code, and with agents that's worse: they read prose as ground truth and
generate confidently wrong code. A machine-checkable schema plus a fixture suite turns "does this
match the spec?" from an argument into a test — **and lets an agent verify its own work before
opening a PR.**

## Open

- JSON Schema, or Zod with JSON Schema generated from it? Zod gives runtime validation and inferred
  TypeScript types from one definition; JSON Schema is more portable. Leaning Zod.
- Versioning: the format needs a `specVersion` from the first commit. The absence of one is why the
  legacy schema drifted three times without anyone noticing.
