---
name: spec
description: Shape Up a feature spec through conversation before planning or building. Use when starting a new feature, significant change, or when scope is unclear.
user_invocable: true
---

# Spec Skill — Shape Up Pitch

You are helping the user shape a feature before any planning or implementation begins. The goal is to produce a **pitch** — a concise document that defines what to build, how much effort it's worth, and what's out of scope. No code, no file paths, no implementation details yet.

## The Shape Up Pitch Format

A pitch has these sections:

### 1. Problem
What's the raw idea or request? Why does it matter? What's the current pain or gap?

### 2. Appetite
How much time is this worth? Not an estimate of how long it *will* take, but a constraint on how long we're *willing* to spend. Use t-shirt sizes:

- **Small** — a few hours, done in one session
- **Medium** — a day or two of focused work
- **Large** — up to a week
- **XL** — multiple weeks (consider breaking it down)

The appetite shapes the solution. A "Small" appetite means we find the simplest version that solves the problem. A "Large" appetite means we can afford a more thorough approach.

### 3. Solution
A rough sketch of the approach — enough to show it's feasible and bounded, but not a blueprint. Use plain language, rough descriptions, or simple diagrams. This is the "shaped" version of the idea: concrete enough to act on, abstract enough to leave room for the builder.

### 4. Rabbit Holes
Risks or complexities that could eat the budget. Call them out explicitly so we can decide upfront whether to tackle or avoid them.

### 5. No-gos
Things we're explicitly NOT doing. Features, edge cases, or scope that someone might assume is included but isn't. This is just as important as defining what's in.

## How to Run the Conversation

**Don't try to fill in the pitch all at once.** Shape it through dialogue:

1. **Start with the problem.** Ask the user to describe the raw idea. Probe until the underlying motivation is clear — "what's broken?" or "what becomes possible?"

2. **Establish appetite.** Ask how much this is worth. Push back if the appetite doesn't match the problem ("that sounds like a Large problem but you said Small — what would a Small version look like?").

3. **Sketch the solution together.** Propose a shaped solution. Be opinionated — suggest the simplest approach that fits the appetite. The user refines.

4. **Surface rabbit holes.** Based on your knowledge of the codebase, flag areas of complexity. Ask the user how to handle them.

5. **Define no-gos.** Explicitly ask "what are we NOT doing?" to draw the boundary.

## Rules

- **Stay at the spec level.** Don't discuss file paths, function names, or implementation steps. That's for plan mode.
- **Be opinionated.** Propose concrete solutions, don't just ask open questions. The user can push back.
- **Respect the appetite.** If the solution grows beyond the appetite, either cut scope or renegotiate the appetite. Don't let it silently expand.
- **One pitch at a time.** Don't try to shape multiple features in one conversation.
- **Write it down.** When the pitch is solid, offer to save it as a markdown file in `specs/` for reference.

## Output Format

When the pitch is finalized, format it as:

```markdown
# [Feature Name]

## Problem
[description]

## Appetite
[size] — [what that means for this feature]

## Solution
[shaped solution sketch]

## Rabbit Holes
- [risk 1]
- [risk 2]

## No-gos
- [explicit exclusion 1]
- [explicit exclusion 2]
```

## After the Spec

Once the pitch is written and the user is satisfied, suggest next steps:
- Use `/delegate` or plan mode to break the solution into implementation tasks
- The spec serves as the source of truth for scope — if something isn't in the pitch, it's out of scope
