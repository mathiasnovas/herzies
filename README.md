```
 _                   _
| |                 (_)
| |__   ___ _ __ _____  ___  ___
| '_ \ / _ \ '__|_  / |/ _ \/ __|
| | | |  __/ |   / /| |  __/\__ \
|_| |_|\___|_|  /___|_|\___||___/
```

Your digital pet that grows by listening to music. **[herzies.app](https://www.herzies.app)**

## Packages

| Package | Description |
|---------|-------------|
| [`herzies`](packages/cli) | CLI application |
| [`@herzies/shared`](packages/shared) | Shared types and utilities |
| [`web`](packages/web) | Website, game server API, and auth |

## Getting Started

```sh
npm i -g herzies
```

## Requirements

- macOS (music detection uses AppleScript and is not yet available on Linux or Windows)

## Development

```sh
pnpm install
pnpm build
```

## Want to contribute?

- **Add support for other operating systems** — music detection currently relies on macOS AppleScript. Linux (e.g. MPRIS) and Windows support would be welcome.
- **Add support for more music players** — we currently detect Apple Music and Spotify, but there are plenty more out there.
