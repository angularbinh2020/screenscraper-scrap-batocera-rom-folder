# Batocera ROM Artwork Updater

Automatically update `gamelist.xml` for Batocera ROM collections by adding missing games and downloading/assigning artwork (images, marquees, thumbnails). The tool can use local image files following Batocera naming conventions, or fetch artwork from the [Screenscraper](https://www.screenscraper.fr/) API.

## Features

- Scans a ROM folder and detects ROM files (e.g. `.sfc`, `.gba`, `.nes`).
- Reads existing `gamelist.xml`, preserving all entries.
- Adds new ROMs to `gamelist.xml` if they are missing.
- Checks for missing artwork (`image`, `thumbnail`, `marquee`) in the local `images` folder.
- Fetches missing artwork from Screenscraper (requires credentials) and saves to `images/`.
- Respects Batocera naming conventions: `[ROM name] - image.ext`, etc.
- Handles special characters safely in XML.
- Detailed logging to console and file; summary report written to a report file.
- Written in TypeScript with dependency injection for easy unit testing (Jest).

## Prerequisites

- **Node.js** >= 14.x
- **npm** (or yarn)
- **Screenscraper API credentials** (optional, for online artwork). Get them at [https://www.screenscraper.fr](https://www.screenscraper.fr/).

## Installation

```bash
git clone <your-repo-url>
cd batocera-rom-artwork-updater
npm install
npm run build   # Compiles TypeScript to dist/
```

The build step runs the TypeScript compiler (`tsc`) and outputs JavaScript to the `dist/` folder. You can also run the program directly with `ts-node` during development:

```bash
npm run dev -- <rom-directory> [options]
```

(Ensure `ts-node` is installed: `npm install -D ts-node`.)

## Configuration

Screenscraper credentials must be provided via environment variables if you want online artwork lookup. If not set, the tool will only use local images.

- `SCREENSCRAPER_DEVID` – your Screenscraper developer ID
- `SCREENSCRAPER_DEVPASSWORD` – your Screenscraper developer password

Example (Linux/macOS):
```bash
export SCREENSCRAPER_DEVID="your_id"
export SCREENSCRAPER_DEVPASSWORD="your_password"
```

On Windows (Command Prompt):
```cmd
set SCREENSCRAPER_DEVID=your_id
set SCREENSCRAPER_DEVPASSWORD=your_password
```

PowerShell:
```powershell
$env:SCREENSCRAPER_DEVID="your_id"
$env:SCREENSCRAPER_DEVPASSWORD="your_password"
```

## Usage

```bash
node dist/index.js <rom-directory> [options]
```

If you installed `ts-node`, you can run directly with:
```bash
npm run dev -- <rom-directory> [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `<rom-directory>` | Path to the ROM folder (contains `.sfc`, `.gba` etc. and optionally an `images` subfolder). | **Required** |
| `--system` | Batocera system name, e.g., `"Nintendo - Super Nintendo Entertainment System"`. If omitted, system is guessed from file extension. | Auto-detect |
| `--delay` | Delay in milliseconds between Screenscraper API requests (to respect rate limits). | `1000` |
| `--log-file` | Path for detailed log file (created inside the ROM directory). | `process.log` |
| `--report-file` | Path for the summary report file (created inside the ROM directory). | `report.txt` |

### Detailed Examples

#### Minimal: only use local images (no Screenscraper)

```bash
node dist/index.js /path/to/roms/nes
```

The program will guess the system from the first ROM file extension and only look for artwork in the `images/` folder.

#### Provide a specific system name

```bash
node dist/index.js /path/to/roms/snes --system "Nintendo - Super Nintendo Entertainment System"
```

#### Enable online artwork lookup with Screenscraper

First set the environment variables:

```bash
export SCREENSCRAPER_DEVID=your_dev_id
export SCREENSCRAPER_DEVPASSWORD=your_dev_password
```

Then run:

```bash
node dist/index.js /path/to/roms/gba --system "Nintendo - Game Boy Advance" --delay 1500
```

If the credentials are not set, the tool will skip online searching and clearly log that only local images are being used.

#### Custom log and report file names

```bash
node dist/index.js /path/to/roms/snes --log-file my_custom.log --report-file my_report.txt
```

#### Windows paths with spaces

Wrap the path in double quotes:

```cmd
node dist/index.js "D:\My Games\roms\snes" --system "Nintendo - Super Nintendo Entertainment System"
```

#### Development run with ts-node

```bash
npm run dev -- /path/to/roms/snes --system "Nintendo - Super Nintendo Entertainment System"
```

## Supported Systems

The table below maps Batocera system names to Screenscraper system IDs. More can be added by editing `src/constants.ts`.

| Batocera System Name | Extensions |
|----------------------|------------|
| Nintendo - Super Nintendo Entertainment System | `.sfc`, `.smc`, `.fig`, `.swc`, `.bs`, `.st` |
| Nintendo - Game Boy Advance | `.gba`, `.srl`, `.agb` |
| Nintendo - Nintendo Entertainment System | `.nes`, `.unf`, `.unif`, `.fds` |
| Sega - Mega Drive - Genesis | `.md`, `.gen`, `.smd`, `.bin` |
| Sega - Master System | `.sms` |
| Sega - Game Gear | `.gg` |
| Nintendo - Game Boy | `.gb` |
| Nintendo - Game Boy Color | `.gbc` |
| Nintendo - Nintendo 64 | `.n64`, `.z64`, `.v64` |
| Nintendo - Virtual Boy | `.vb` |
| Sony - PlayStation | `.cue`, `.iso`, `.bin`, `.img` |

## How It Works

1. **Read ROM files** from the provided directory (filtered by extension if system is known, otherwise all files).
2. **Parse `gamelist.xml`** (create if missing).
3. For each ROM:
   - If it already has **all** artwork (`image`, `thumbnail`, `marquee`) pointing to existing files, it is skipped.
   - If artwork is missing, first look in `<rom-dir>/images/` using Batocera naming: `<romname> - <type>.ext`.
   - If still missing and Screenscraper credentials are available, query the API using the ROM’s MD5 hash.
   - Artwork mapping from Screenscraper:
     - `box-2D` (preferred) or `box-3D` → Batocera `image`
     - `ss` (screenshot) → Batocera `thumbnail`
     - `wheel` → Batocera `marquee`
   - Downloaded images are saved to `images/` with correct Batocera names.
4. **Update `gamelist.xml`**: add new entries or update existing ones with the new image paths.
5. **Log all actions** and produce a final report.

## Logging and Reporting

- **Console output** – real-time processing log.
- **Log file** (`process.log` by default) inside the ROM directory – detailed timestamped log.
- **Report file** (`report.txt` by default) – a summary showing:
  - Total ROMs
  - Processed (added or updated)
  - Skipped (already complete)
  - Number of ROMs still missing some artwork
  - List of incomplete ROMs with missing image types

## Testing

The project is structured for unit testing with [Jest](https://jestjs.io/).

```bash
npm test
```

Test files are located in the `tests/` folder. Dependency injection is used throughout, making it easy to mock external services like file system and Screenscraper client.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

### Adding new systems
Edit the `SYSTEM_MAP` array in `src/constants.ts` with the correct Batocera name, Screenscraper `systemeid`, and ROM extensions.

## License

[MIT](LICENSE)