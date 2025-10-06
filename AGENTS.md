# Repository Guidelines

## Project Structure & Module Organization
- `index.ts` is the entrypoint that queries BPS APIs, stores raw JSON snapshots under `json/`, and materializes CSV exports inside `data/`.
- `csv-to-sql/` contains a small Go utility (`main.go`, `converter.go`) that converts the generated CSV files to SQL insert statements; run it only after fresh CSVs exist.
- Generated artefacts (`data/*.csv`, `json/**/*.json`) are safe to delete between runs; they will be recreated as needed.
- Keep TypeScript source in the repository root and place any supporting scripts under clearly named folders (for example `scripts/` for future helpers).

## Build, Test, and Development Commands
- `npm install` — install TypeScript, tsx, and supporting dependencies.
- `npx tsx index.ts` — execute the data collection pipeline; results land in `json/` and `data/`.
- `go run ./csv-to-sql` — produce SQL files from the latest CSV exports (requires Go 1.21+).
- `npm run test` — currently a stub; replace with real checks when tests are introduced.

## Coding Style & Naming Conventions
- TypeScript files use 4-space indentation, ES module syntax, and prefer double quotes to match `index.ts`.
- Derive filenames from BPS codes (e.g. `json/kecamatan/320109-3201091000.json`) and sanitize user-facing strings before writing.
- For Go code follow `gofmt` output; keep package-level functions short and focused.

## Testing Guidelines
- No automated tests exist yet; validate changes by running `npx tsx index.ts` and inspecting the resulting CSV record counts.
- Spot-check JSON payloads for structure regressions and confirm postal code columns populate correctly when available.
- When changing fetching logic, capture before/after row counts in the PR description to document the data impact.

## Commit & Pull Request Guidelines
- Use concise, imperative commit subjects similar to `Update database with comprehensive Indonesian region data` seen in history.
- One commit per logical change is preferred; include context in the body when altering data formats or API contracts.
- Pull requests should summarize the motivation, outline verification steps (commands run, files touched), and link related issues or data tickets.
- Attach sample output snippets or file listings when the change affects generated CSV/JSON artefacts so reviewers can validate quickly.
