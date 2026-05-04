```
 _                   _
| |                 (_)
| |__   ___ _ __ _____  ___  ___
| '_ \ / _ \ '__|_  / |/ _ \/ __|
| | | |  __/ |   / /| |  __/\__ \
|_| |_|\___|_|  /___|_|\___||___/
```
A digital pet that lives in your terminal that grows by listening to music. **[herzies.app](https://www.herzies.app)**

<p align="center">
 <img width="675" alt="herzies CLI" src="https://raw.githubusercontent.com/Herzies/herzies/main/packages/cli/assets/screenshot.png" />
</p>

## Install

```sh
npm i -g herzies
```

## Usage

```sh
herzies              # open the live dashboard
herzies hatch        # create your herzie
herzies status       # quick snapshot of your herzie
herzies start        # start background listening (no terminal needed)
herzies stop         # stop background listening
herzies autostart    # auto-start daemon on login (on/off)
herzies login        # log in to sync from another device
herzies friends      # manage your friendzies
herzies friends add  # add a friendzie by code
herzies kill         # permanently delete your herzie
herzies help         # show available commands
```

## Requirements

- macOS (music detection uses AppleScript and is not yet available on Linux or Windows)

## Want to contribute?

- **Add support for other operating systems** — music detection currently relies on macOS AppleScript. Linux (e.g. MPRIS) and Windows support would be welcome.
- **Add support for more music players** — we currently detect Apple Music and Spotify, but there are plenty more out there.

## License

MIT
