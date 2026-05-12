# Desktop Herzie: More Pop, Same Terminal Soul

## Problem

The **3D ASCII characters** feel dim and low-contrast: they blend into the dark background and read flat (weak highlights and shadows inside the figure). Global brightness tweaks do not fix it because the issue is **separation and local contrast inside the character render**, not overall screen luminance. We want characters to feel more vibrant and legible without abandoning the retro-terminal aesthetic.

## Appetite

**Medium** — about a day or two of focused iteration: tune how characters are lit and shaded in ASCII space, improve how they read against the scene, and validate across rotation angles (and any other surfaces that use the same character pipeline). Scope stays on **character rendering**, not a broader layout or chrome pass.

## Solution

Treat “pop” as **separable knobs**, all in service of the character read:

1. **Internal read** — Stronger **in-mesh** shading (lit faces, turning edges, occluded areas) so 3D reads while rotating. Prefer palette and luminance-to-glyph mapping over washing the whole canvas or the starfield.

2. **Controlled separation from the world** — If figures still sink into the backdrop after stronger shading, use **creature-local** treatments only (for example edge emphasis, rim, or a tight backdrop behind the render region) that do **not** alter star rendering, density, color, or motion.

3. **Restrained character accents** — At most **one** optional highlight pass on the creature (for example a narrow rim or specular band) so extra vibrancy reads intentional, not like a filter on the entire scene. Surrounding UI stays as-is unless a shared token forces a tiny compatibility tweak.

Success looks like: **characters read crisp at a glance**, rotation still feels seamless, the rest of the shell feels unchanged by design, and a screenshot still reads as terminal-native, not generic game UI.

## Rabbit Holes

- **Chasing brightness** — Global gamma or brightness lifts noise and flattens the “dim luxury” vibe; cap it as a tactic, not the main fix.

- **Glyph moiré or flicker** — Aggressive contrast or per-frame shimmer can make ASCII crawl when the model or view moves; any sparkle needs a stability pass while rotating.

- **Theme coupling** — If character colors share tokens with unrelated UI, a character-only fix can have side effects; prefer isolating character palette or accepting a minimal shared-token audit.

- **Accessibility and fatigue** — Higher contrast is good, but pure white-on-black spikes and heavy glow fatigue; prefer mid-tone separation plus controlled accents.

## No-gos

- **Not a home or global shell polish** — no broad refresh of layout, chat, stats, tabs, or general chrome for contrast; those are fine as-is unless a shared-token fix is unavoidable for character work.

- No full visual redesign or new art direction (still monospace, terminal-native, same information architecture).

- No replacing ASCII rendering with textured 3D meshes for realism.

- **No changes to the starfield** — leave star rendering, density, color, and motion as they are.

- No heavy bloom or glassmorphism across the entire UI unless explicitly scoped as a separate pitch later.

- No one-off “screenshot mode” unless appetite grows; prefer changes that look right in daily use and rotation.

---

**Next steps:** Use plan mode or `/delegate` to break this into implementation tasks. Scope is bounded by this document; anything not described here is out of scope unless the pitch is revised.
