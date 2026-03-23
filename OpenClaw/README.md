# Herena × OpenClaw — integration tests (RunPod / Docker / local)

This folder contains smoke and E2E scripts so you can verify that **Herena Agentic API** (`GET/POST .../agentic/...`) works for OpenClaw-style agents and remote runners.

> **Note:** The hackathon “OpenClaw” bounty usually expects your own agent app plus Hedera. Here, Herena exposes an **HTTP surface**; this package **automates testing** of that surface on RunPod or CI. Official npm packages like `@xpr-agents/openclaw` may target another stack — your agent can still `fetch` these URLs.

---

## Prerequisites

1. **Herena `server`** is running (`npm run dev` or deployed).
2. **`MONGO_URI`** is set; the API must respond (empty task lists are OK for smoke).
3. The test machine can reach Herena over the **network** (RunPod → your public API URL or tunnel).

---

## 1) Local test (fastest)

Terminal 1 — Herena server:

```bash
cd server
cp .env.template .env   # MONGO_URI, SERVER_PORT, CLIENT
npm install && npm run dev
```

Terminal 2 — smoke test:

```bash
cd OpenClaw
cp .env.example .env    # optional; or export env vars directly

export HERENA_AGENTIC_BASE_URL=http://localhost:5000
npm test
```

Expected: `✅ All smoke checks passed...` (includes `GET /agentic/chain/meta`).

Match the URL to `SERVER_PORT` in `server/.env`.

---

## 2) If Herena is not public (tunnel)

Example with ngrok:

```bash
ngrok http 5000
```

Set `HERENA_AGENTIC_BASE_URL` to the ngrok `https://....ngrok-free.app` origin (no trailing slash).

---

## 3) RunPod with Docker

### A) Build image (local or CI)

From repo root:

```bash
docker build -t herena-openclaw-test -f OpenClaw/Dockerfile OpenClaw
```

Push to Docker Hub (example):

```bash
docker tag herena-openclaw-test YOUR_DOCKERHUB_USER/herena-openclaw-test:latest
docker push YOUR_DOCKERHUB_USER/herena-openclaw-test:latest
```

### B) Run on RunPod

1. Create a **Pod** (GPU not required; CPU is enough).
2. Image: `YOUR_DOCKERHUB_USER/herena-openclaw-test:latest`
3. **Environment variables:**
   - `HERENA_AGENTIC_BASE_URL` = Herena public base URL  
     Example: `https://api.your-domain.com`  
     (Host only; paths like `/agentic` are appended by the scripts.)
4. Default **CMD** runs the smoke test; **exit code 0** means success.
5. Logs should show `✅ All smoke checks passed`.

> Some RunPod templates open an interactive shell; then inside the pod:

```bash
export HERENA_AGENTIC_BASE_URL=https://your-api.com
node /app/scripts/smoke-test.mjs
```

### C) RunPod: clone repo + Node (no Docker)

SSH / terminal on the pod:

```bash
git clone <your-repo> && cd herena/OpenClaw
export HERENA_AGENTIC_BASE_URL=https://your-api.com
npm test
```

(Node 20+ required.)

---

## 4) Optional: MongoDB-only proof (not on-chain)

```bash
export HERENA_AGENTIC_BASE_URL=https://...
export TEST_TASK_ID=1
export TEST_SUBMITTER=0x0000000000000000000000000000000000000001
export TEST_PROOF_URI=https://example.com/dummy-proof.json
npm run post-proof
```

---

## 5) On-chain E2E — `submitProof` with private key (OpenClaw flow)

Flow: **`POST /agentic/chain/tx/prepare-submit-proof`** → agent signs with **`ethers`** → **`POST /agentic/chain/tx/broadcast`** → **`GET /agentic/chain/tx/:hash`**.

```bash
cd OpenClaw
npm install

export HERENA_AGENTIC_BASE_URL=http://localhost:5000
export HEDERA_RPC_URL=https://testnet.hashio.io/api
export AGENT_PRIVATE_KEY=0x...   # testnet key that has NOT submitted proof for this task
export E2E_TASK_ID=0             # on-chain task id (TaskManager)
export E2E_PROOF_URI=ipfs://...  # non-empty URI

npm run test:chain
```

- `HEDERA_RPC_URL` must be the **same network** as Herena `server/.env` (`chainId` must match).
- The wallet must not have called `submitProof` for that task yet (`AlreadySubmittedForTask`).
- To only print the signed tx: `E2E_DRY_RUN=1 npm run test:chain`

On RunPod: clone → `cd OpenClaw && npm install` → set env vars → `npm run test:chain`.

---

## 6) Troubleshooting

| Issue | Check |
|--------|--------|
| `fetch failed` / `ECONNREFUSED` | URL, port, firewall; outbound access from RunPod |
| `404` on `/agentic` | Server up to date? `/agentic` mounted in `routes/public/index.ts` |
| `Chain not configured` / `503` | `server/.env`: `HEDERA_RPC_URL`, `*_ADDRESS` filled? |
| `openClaw integration not active` | Old `agentic.ts`; `integrations.openClaw.status === "active"` |
| `test:chain` nonce / gas | RPC and key on same network; HBAR balance for gas |
| CORS (browser only) | These scripts use **Node `fetch`** — CORS does not apply |

---

## File summary

| File | Purpose |
|------|---------|
| `scripts/smoke-test.mjs` | HTTP + `/agentic/chain/meta` smoke |
| `scripts/e2e-chain-proof.mjs` | prepare → sign → broadcast → receipt |
| `scripts/post-proof-example.mjs` | MongoDB mirror proof only |
| `Dockerfile` | RunPod smoke (no private key baked in) |
| `.env.example` | Env template |

- Agentic routes: `server/routes/public/agentic.ts`
- Tx encoding / broadcast: `server/lib/agenticChain.ts`
