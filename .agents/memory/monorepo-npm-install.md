---
name: Monorepo npm install
description: How npm packages must be installed in this monorepo (backend/ + frontend/)
---

## Rule
The `installLanguagePackages` skill callback installs packages into the **root** `package.json` and `node_modules/`. Sub-packages (`frontend/`, `backend/`) do NOT automatically get their binaries (e.g. `vite`, `tsc`).

**Always run `npm install` via ShellExec inside each sub-directory after writing its `package.json`:**
```bash
cd frontend && npm install
cd backend && npm install
```

Workflow commands must use the local binary path:
```
cd frontend && ./node_modules/.bin/vite --port 5000 --host 0.0.0.0
```

**Why:** `npx vite` prompts for confirmation when the binary isn't installed locally, which hangs non-interactive workflow processes.

**How to apply:** Any time a new package is needed in frontend/ or backend/, run npm install in that subdirectory via ShellExec.
