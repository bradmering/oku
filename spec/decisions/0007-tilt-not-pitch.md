# 0007 — `tilt` for camera angle; `pitch` means a rope length

**Status:** accepted (2026-07-27) · **Not yet applied to legacy code**

## Decision

Camera angle is **`tilt`**. The name `pitch` is reserved for its climbing meaning: a rope length.

## Why

**Both meanings already coexist in one union in the legacy renderers.**

| Field | Meaning |
|---|---|
| `MapChapter.pitch`, `ArticleChapter.pitch` | camera tilt in degrees (sits beside `zoom`/`bearing`) |
| `TopoChapter.pitch`, `TopoData.pitch` | a climbing pitch — rendered to readers as "Pitch 3", bound to a belay marker |

Because `TopoStoryChapter = Chapter | TopoChapter`, a **single chapters array can hold `pitch: 50`
(degrees) beside `pitch: 3` (third rope length)**, disambiguated only by `type`. Any generic code
reading `chapter.pitch` to set camera angle will tilt to 3° on a topo chapter.

Keep `pitch` for the climbing sense: it's the domain term, authors type it, and readers see it.
Rename the camera field, which is internal and touched only by the spec and the map call site —
translating `tilt → mapbox.pitch` is one line.

## Consequences

- New code uses `tilt`. Legacy migration is a separate task.
- The climbing sense may dissolve anyway: under 0006 a pitch is a segment with `labelScheme:
  'pitch'`, so `TopoChapter.pitch` likely becomes segment identity rather than a chapter field.
- *(Third meaning, prose only: "pitch" as in a sales pitch. Keep it out of the schema.)*
