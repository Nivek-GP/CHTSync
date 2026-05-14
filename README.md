# CheatSync for MinUI

> Desktop app that auto-downloads `.cht` cheat files from [libretro-database](https://github.com/libretro/libretro-database) for your MinUI ROM collection.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Auto-match** — fuzzy matching by game name, region, and cheat device preference (GameShark > Action Replay > ... > Game Buster)
- **11 platforms** — PS, GBA, SFC, GBC, GB, FC, MD, SMS, GG, PCE, NGP
- **Live log** — color-coded output as files download
- **Skip / Force** — skips already-downloaded files by default; force re-download with one toggle
- **GitHub Token** — optional, raises API rate limit from 60 to 5,000 requests/hr
- **Persistent settings** — folders and token remembered between sessions
- **Dark / Light theme** — toggle in the header, preference saved

## Download

Go to the [Releases page](https://github.com/Nivek-GP/CheatSync/releases) and download the installer for your platform:

| Platform | File |
| -- | -- |
| Windows | `CheatSync-x.x.x-setup.exe` |
| macOS | `CheatSync-x.x.x.dmg` |

## Usage

1. **ROM Folder** — select the root folder containing your ROM platform subfolders (e.g. `F:\Roms`)
2. **Cheats Folder** — select where `.cht` files will be saved (e.g. `F:\Cheats`)
3. Select which **platforms** to process
4. Click **Start Sync**

CheatSync will index the libretro-database, match each ROM to the best available cheat file, and download it to `Cheats/{platform}/` named after the ROM file.

### File placement

Downloaded files are saved as:

```
{CheatsRoot}/{platform}/{rom_filename}.cht
```

These are compatible with [MinUI's cheat support](https://github.com/Nivek-GP/MinUI-Miyoo-Flip-Enhanced).

### GitHub Token (optional)

Without a token, the GitHub API allows 60 requests/hr — enough for the tree index but may throttle on repeated runs. A personal access token raises the limit to 5,000/hr.

Generate one at **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)** with no scopes needed (public repo access is sufficient).

## Supported platforms

| Tag | System |
| -- | -- |
| PS | Sony PlayStation |
| GBA | Nintendo Game Boy Advance |
| SFC | Super Nintendo |
| GBC | Game Boy Color |
| GB | Game Boy |
| FC | Nintendo Entertainment System |
| MD | Sega Mega Drive / Genesis |
| SMS | Sega Master System |
| GG | Sega Game Gear |
| PCE | NEC PC Engine / TurboGrafx-16 |
| NGP | SNK Neo Geo Pocket Color |

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
- [libretro-database](https://github.com/libretro/libretro-database) — source of all cheat files
