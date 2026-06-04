<div align="center">
  <img src="https://raw.githubusercontent.com/Nivek-GP/CHTSync/9b6c43f/resources/icon.png" width="100" alt="CHTSync">
  <h1>CHTSync for MinUI</h1>
  <p>Desktop app that auto-downloads <code>.cht</code> files from <a href="https://github.com/libretro/libretro-database">libretro-database</a> for your MinUI ROM collection.</p>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</div>

## About .cht files

`.cht` is an open file format used by the [libretro](https://www.libretro.com/) emulation ecosystem to store **single-player game enhancement codes** (e.g. infinite lives, level select) for classic, offline retro games. They are unrelated to online multiplayer or competitive gaming.

The [libretro-database](https://github.com/libretro/libretro-database) is a community-maintained, publicly licensed repository that distributes these files freely. CHTSync is a download-automation utility — equivalent to a package manager — that fetches those publicly available files and organises them into the folder structure expected by MinUI. No copyrighted game data is stored, bundled, or redistributed by this tool.

## Features

- **Auto-match** — fuzzy matching by game name, region, and device preference (GameShark > Action Replay > ... > Game Buster)
- **22 platforms** — PS, PSP, DC, N64, NDS, GBA, MGBA, SFC, SUPA, SGB, GBC, GB, FC, VB, PKM, MD, SMS, GG, PCE, NGPC, FBNEO, VARCADE
- **Two-step orphan cleanup** — scan to preview the count, then confirm with one click to delete
- **Live log** — color-coded output as files download
- **Skip / Force** — skips already-downloaded files by default; force re-download with one toggle
- **GitHub Token** — optional, raises API rate limit from 60 to 5,000 requests/hr
- **Persistent settings** — folders and token remembered between sessions
- **Dark / Light theme** — toggle in the header, preference saved

## Download

Go to the [Releases page](https://github.com/Nivek-GP/CHTSync/releases) and download the installer for your platform:

| Platform | File |
| -- | -- |
| Windows | `CHTSync-x.x.x-setup.exe` |
| macOS | `CHTSync-x.x.x.dmg` |

## Usage

1. **ROM Folder** — select the root folder containing your ROM platform subfolders (e.g. `F:\Roms`)
2. **CHT Folder** — select where `.cht` files will be saved (e.g. `F:\Chts`)
3. Select which **platforms** to process
4. Click **Start Sync**

CHTSync will index the libretro-database, match each ROM to the best available .cht file, and download it to `Chts/{platform}/` named after the ROM file.

### File placement

Downloaded files are saved as:

```
{ChtsRoot}/{platform}/{rom_filename}.cht
```

These are compatible with [MinUI's .cht support](https://github.com/Nivek-GP/MinUI-Miyoo-Flip-Enhanced).

### GitHub Token (optional)

Without a token, the GitHub API allows 60 requests/hr — enough for the tree index but may throttle on repeated runs. A personal access token raises the limit to 5,000/hr.

Generate one at **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)** with no scopes needed (public repo access is sufficient).

## Supported platforms

| Tag | System |
| -- | -- |
| PS | Sony PlayStation |
| PSP | Sony PlayStation Portable |
| DC | Sega Dreamcast |
| N64 | Nintendo 64 |
| NDS | Nintendo DS |
| GBA | Nintendo Game Boy Advance |
| MGBA | Nintendo Game Boy Advance (mGBA core) |
| SFC | Super Nintendo |
| SUPA | Super Nintendo (Supa core) |
| SGB | Super Game Boy |
| GBC | Game Boy Color |
| GB | Game Boy |
| FC | Nintendo Entertainment System |
| VB | Nintendo Virtual Boy |
| PKM | Nintendo Pokémon mini |
| MD | Sega Mega Drive / Genesis |
| SMS | Sega Master System |
| GG | Sega Game Gear |
| PCE | NEC PC Engine / TurboGrafx-16 |
| NGPC | SNK Neo Geo Pocket Color |
| FBNEO | Arcade (FBNeo) |
| VARCADE | Vertical Arcade (FBNeo) |

## Building from source

```bash
npm install
npm run dev        # development
npm run build:win  # Windows installer (.exe)
npm run build:mac  # macOS disk image (.dmg)
```

> macOS builds must be run on a Mac. Windows builds must be run on Windows.

## Related

- [MinUI — Miyoo Flip Enhanced](https://github.com/Nivek-GP/MinUI-Miyoo-Flip-Enhanced) — the MinUI fork this tool was built for
- [libretro-database](https://github.com/libretro/libretro-database) — source of all .cht files
- [ArtSync for MinUI](https://github.com/Nivek-GP/ArtSync) — companion app to sync boxart
