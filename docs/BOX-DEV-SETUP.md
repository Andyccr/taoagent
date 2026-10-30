# Box (Linux) dev setup

TaoAgent needs Node.js >= 22.19 (`--experimental-strip-types`). The box's system Node is 20, so a user-local Node 22 is used. No Python/Rust/pnpm needed.

## One-time install

```sh
cd /tmp
curl -fsSLO https://nodejs.org/dist/latest-v22.x/node-v22.23.4-linux-x64.tar.xz
curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep linux-x64.tar.xz | sha256sum -c
mkdir -p ~/.local/opt && tar -xJf node-v22.23.4-linux-x64.tar.xz -C ~/.local/opt
ln -sfn ~/.local/opt/node-v22.23.4-linux-x64 ~/.local/opt/node22
export PATH=~/.local/opt/node22/bin:$PATH      # add to ~/.bashrc if wanted
cd /home/box/projects/TaoAgent/taoagent && npm ci
```

## Build, check, test

```sh
export PATH=~/.local/opt/node22/bin:$PATH
npm run build            # public/city.bundle.js (帝国之城) + release/server.mjs
npm run lint:baseline    # syntax checks
npm test                 # full suite; the browser e2e test is skipped unless enabled:
TAOAGENT_E2E_PLAYWRIGHT=/workspace/shots-tool/node_modules/playwright-core \
TAOAGENT_E2E_CHROME=/usr/bin/google-chrome npm test
```

`playwright-core` is NOT a project dependency; it lives in `/workspace/shots-tool` (`npm i playwright-core@1`).

## Run

```sh
export PATH=~/.local/opt/node22/bin:$PATH
# development (TypeScript sources directly)
PORT=3591 TAOAGENT_HOME=/path/to/home node --experimental-strip-types --disable-warning=ExperimentalWarning app.ts
# release bundle (same as Windows)
PORT=3591 TAOAGENT_HOME=/path/to/home node release/server.mjs
```

Open http://127.0.0.1:3591/ — 帝国之城 is the first sidebar entry, or open `/#empire-city` directly.
The server binds to 127.0.0.1 only. Without `TAOAGENT_HOME` it uses `./home` (Andy's real data, including model keys).
For safe verification on the box use a copy with keys blanked: `/workspace/shots-tool/make-box-home.sh` creates
`/home/box/projects/TaoAgent/box-home`. With blank keys no model call can succeed; the city itself never calls a model.

After changing anything under `public/city/` or `public/city-entry.js`, run `npm run build:city` and restart the server
(the server caches static assets at startup).

## Windows

Unchanged: `Start Taoagent.cmd` / `Taoagent.exe` run `runtime\node.exe launcher.mjs` → `release/server.mjs`.
Run `npm run build` before packaging (`npm run pack:windows`) so `release/server.mjs` and `public/city.bundle.js` are current.

## Linux-specific fix

`execution.ts`: on POSIX the tool shell is spawned in its own process group and pause/timeout kills the whole group
(`process.kill(-pid)`), matching what `taskkill /t` already did on Windows. This fixed the one test that failed on Linux
(`pausing a running Shell stops its descendant…`). The Windows branch is unchanged.
