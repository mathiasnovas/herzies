```
 _                   _
| |                 (_)
| |__   ___ _ __ _____  ___  ___
| '_ \ / _ \ '__|_  / |/ _ \/ __|
| | | |  __/ |   / /| |  __/\__ \
|_| |_|\___|_|  /___|_|\___||___/
```
A CLI pet that grows by listening to music. **[herzies.app](https://www.herzies.app)**

<p align="center">
 <img width="675" alt="herzies CLI" src="https://raw.githubusercontent.com/Herzies/herzies/main/packages/cli/assets/screenshot.png" />
</p>

## Install

```sh
npm i -g herzies
```

## Usage

```sh
herzies             # start listening
herzies hatch       # create your herzie
herzies status      # check on your herzie
herzies register    # create an account
herzies login       # log in
herzies friends     # manage friends
herzies help        # show available commands
```

## Requirements

- macOS (music detection uses AppleScript and is not yet available on Linux or Windows)

## Want to contribute?

- **Add support for other operating systems** — music detection currently relies on macOS AppleScript. Linux (e.g. MPRIS) and Windows support would be welcome.
- **Add support for more music players** — we currently detect Apple Music and Spotify, but there are plenty more out there.

## License

MIT
