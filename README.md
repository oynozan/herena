# Herena

Decentralized sustainability verification protocol on Hedera. Volunteers complete real-world sustainability tasks, submit cryptographic proofs, and earn HRN token rewards through community-driven quadratic voting.

## How It Works

1. **Admin creates a task** on-chain with a description, reward budget, and deadline. Rewards are pre-funded from the Treasury.
2. **Volunteers complete tasks** in the real world and compose rich-text proof documents (text, photos, video) that are stored on IPFS.
3. **A governance proposal is automatically created** for each proof submission. Staked community members vote to approve or reject during a 48-hour window using quadratic voting.
4. **Rewards are distributed on resolution** — 80% to the volunteer, 20% split among approving voters proportional to their voting power.
5. **All events are logged** to a Hedera Consensus Service topic, creating an immutable public audit trail.

## Project Structure

```
herena/
├── contracts/     Solidity smart contracts (Hardhat)
├── server/        Backend API (Express + MongoDB)
├── web/           Frontend (Next.js 16 + React 19)
└── OpenClaw/      Agentic integration test harness
```

---

## [contracts/](contracts/)

Solidity 0.8.20 smart contracts deployed on Hedera EVM (testnet, chain 296). Built with Hardhat 3 and OpenZeppelin v5.

### Contracts

| Contract | Description |
|----------|-------------|
| [Herena.sol](contracts/contracts/Herena.sol) | ERC-20 HRN token. 1M fixed supply minted to Treasury on deploy. |
| [Treasury.sol](contracts/contracts/Treasury.sol) | Holds HRN reserves and funds tasks. Enforces optional per-task reward caps. |
| [TaskManager.sol](contracts/contracts/TaskManager.sol) | On-chain task definitions with reward budgets, deadlines, and completion tracking. |
| [ProofManager.sol](contracts/contracts/ProofManager.sol) | Proof submissions (IPFS URI). Triggers governance proposals automatically. |
| [VotingManager.sol](contracts/contracts/VotingManager.sol) | Quadratic voting, proposal resolution, and 80/20 reward distribution. |
| [StakingManager.sol](contracts/contracts/StakingManager.sol) | HRN staking for voting power. Power = floor(sqrt(staked)). |
| [SwapPool.sol](contracts/contracts/SwapPool.sol) | Constant-product AMM (x*y=k) for HRN/HBAR swaps. 0.3% fee. |
| [LPToken.sol](contracts/contracts/LPToken.sol) | LP token for SwapPool liquidity providers. |

### Deployment Order

```
Herena → Treasury → StakingManager → TaskManager → ProofManager → VotingManager → SwapPool
```

Cross-contract wiring (Treasury↔TaskManager, ProofManager↔VotingManager, etc.) is handled by the deploy script. See [contracts/README.md](contracts/README.md) for the full architecture diagram.

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/deploy.ts` | Full deployment pipeline with cross-contract setup |
| `scripts/create-task.ts` | Create a task from CLI |
| `scripts/seed-liquidity.ts` | Seed the AMM with initial HRN + HBAR liquidity |

### Tests

```bash
cd contracts && npm test
```

Unit tests for every contract plus an end-to-end integration test covering the full task → proof → vote → resolve → reward lifecycle.

---

## [server/](server/)

Express.js backend with MongoDB (Mongoose), Socket.IO for real-time updates, and blockchain event polling.

### Running

```bash
cd server
cp .env.template .env   # Fill in values
npm install
npm run dev              # Development (ts-node-dev)
npm run build && npm start  # Production
```

### Core Architecture

| Directory | Description |
|-----------|-------------|
| [lib/eventSync.ts](server/lib/eventSync.ts) | Polls Hedera blocks every 10s, processes 11 event types, syncs to MongoDB, auto-resolves expired proposals, awards badges |
| [lib/contracts.ts](server/lib/contracts.ts) | Initializes ethers.js contract instances (read-only + admin signer) |
| [lib/badges.ts](server/lib/badges.ts) | Badge award logic and HTS NFT minting |
| [lib/hcs.ts](server/lib/hcs.ts) | Hedera Consensus Service audit trail logging |
| [lib/heliProof.ts](server/lib/heliProof.ts) | IPFS storage via Kubo RPC or embedded Helia node |
| [lib/agenticChain.ts](server/lib/agenticChain.ts) | Agentic API: builds unsigned transactions for external signing |

### Models

| Model | Description |
|-------|-------------|
| `Task` | Mirrored on-chain tasks with metadata |
| `Proof` | Proof submissions (proofId, submitter, IPFS URI) |
| `Proposal` | Governance proposals with vote tallies |
| `Vote` | Individual votes (voter, power, approve/reject) |
| `UserTask` | Per-user task participation and earned rewards |
| `StakeRecord` | Stake/unstake history |
| `SwapRecord` | Swap transaction history |
| `Badge` | Impact badges with optional HTS serial numbers |

### API Routes

**Public** (`/`):

| Route | Description |
|-------|-------------|
| `GET /tasks` | List and filter tasks |
| `GET /tasks/:id` | Task details and proofs |
| `GET /proposals` | List governance proposals |
| `GET /proposals/:id` | Proposal details with votes |
| `POST /proof-artifacts/image` | Upload proof image to IPFS (10 MB limit) |
| `POST /proof-artifacts/video` | Upload proof video to IPFS (50 MB limit) |
| `POST /proof-artifacts` | Upload proof JSON document to IPFS |
| `GET /user/badges` | User's earned badge NFTs |
| `GET /swap` | Swap pool reserves and stats |
| `GET /leaderboard` | Community leaderboard |
| `GET /stats` | Protocol statistics |
| `GET /config` | Client configuration (IPFS gateway) |
| `/agentic/*` | Full agentic API for AI agent integration |

**Protected** (`/protected`, ES256 JWT):

| Route | Description |
|-------|-------------|
| `POST /admin/task` | Create task on-chain |
| `POST /ipfs/upload` | IPFS upload |

### Authentication

- **Users**: Privy wallet authentication via identity tokens
- **Server-to-server**: ES256 JWT verification
- **Admin**: Wallet address allowlist

---

## [web/](web/)

Next.js 16 frontend with React 19, Tailwind CSS 4, and shadcn/ui components.

### Running

```bash
cd web
cp .env.template .env   # Fill in values
npm install
npm run dev              # Development
npm run build && npm start  # Production
```

### Pages

**Main App** (`/`):

| Route | Page |
|-------|------|
| `/` | Browse sustainability tasks |
| `/task/:id` | Task details, proof submissions, proof history |
| `/governance` | Governance proposals list |
| `/governance/:id` | Proposal voting page with proof viewer |
| `/swap` | HRN/HBAR swap interface |
| `/leaderboard` | Community rankings |
| `/dashboard` | User dashboard |
| `/admin` | Admin panel (task creation, parameter management) |

**User Pages** (`/user`):

| Route | Page |
|-------|------|
| `/badges` | Impact badge collection |
| `/my-proofs` | Submitted proofs history |
| `/staking` | Stake/unstake HRN |
| `/votes` | Voting history |

**Meta**:

| Route | Page |
|-------|------|
| `/whitepaper` | Full technical whitepaper |

### Key Components

| Component | Description |
|-----------|-------------|
| `ProofComposer` | Rich-text editor (Tiptap) for composing proofs with images and video |
| `ProofForum` | Paginated proof table with status badges and on-chain verification links |
| `ProofRenderer` | Read-only Tiptap renderer for viewing proofs in proposals |
| `TaskMetadata` | Renders task descriptions from IPFS |
| `VotingPanel` | Cast approve/reject votes with real-time vote tallies |

### Client Libraries

| File | Description |
|------|-------------|
| [lib/hedera.ts](web/src/lib/hedera.ts) | Contract interactions via browser wallet (vote, stake, swap) |
| [lib/proofContract.ts](web/src/lib/proofContract.ts) | Proof submission contract interaction |
| [lib/api.ts](web/src/lib/api.ts) | Server API client |
| [lib/ipfs.ts](web/src/lib/ipfs.ts) | IPFS URL resolution and content transformation |
| [lib/tiptap-video.ts](web/src/lib/tiptap-video.ts) | Custom Tiptap video node extension |

---

## [OpenClaw/](OpenClaw/)

Agentic integration layer for AI agent interaction with the protocol. Provides a prepare-sign-broadcast pattern where agents can browse tasks/proposals, build unsigned transactions, sign externally, and broadcast.

Includes a Dockerized smoke test suite (Node 22 Alpine) for CI/RunPod validation.

---

## Features

### Task Lifecycle

Tasks are created by admins with a description, IPFS metadata, reward per completion, max completions, and a deadline. The full reward budget (`reward × maxCompletions`) is locked from Treasury at creation. Tasks expire automatically when the deadline passes.

### Proof Submission

Volunteers compose rich-text proofs using a Tiptap editor supporting text formatting, images, and video uploads. Content is stored on IPFS, and the CID is submitted on-chain via ProofManager. Each user can submit one proof per task.

### Quadratic Voting

Proposals are voted on by staked community members. Voting power follows a quadratic formula: `P(s) = floor(sqrt(s))`, where `s` is the staked HRN amount. This reduces whale influence — staking 100 HRN gives 10 voting power, not 100.

### Reward Distribution

When a proposal is approved (approve votes > reject votes), rewards are split:
- **80%** to the proof submitter
- **20%** to approving voters, proportional to their quadratic voting power

### HRN/HBAR Swap

A built-in constant-product AMM enables HRN/HBAR trading. The pricing formula is `x * y = k` with a 0.3% swap fee. Liquidity providers earn LP tokens representing their pool share.

### Impact Badges

Four badge NFTs are awarded automatically for milestones:

| Badge | Trigger |
|-------|---------|
| First Submission | Submit your first proof |
| First Approval | First proof approved by the community |
| First Stake | Stake 10+ HRN |
| First Vote | Cast your first governance vote |

Badges are stored in MongoDB and minted as Hedera Token Service (HTS) non-fungible tokens on the `HBADGE` collection.

### HCS Audit Trail

All significant protocol events (proof submissions, votes, proposal resolutions, badge awards) are logged as structured JSON to a Hedera Consensus Service topic — an immutable, timestamped, publicly queryable audit trail.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Blockchain | Solidity 0.8.20, Hedera EVM (testnet), Hardhat 3, OpenZeppelin v5, ethers.js v6 |
| Backend | Node.js, TypeScript, Express.js 4, MongoDB (Mongoose 8), Socket.IO 4 |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Tiptap, Recharts |
| Auth | Privy (wallet authentication), ES256 JWT (server-to-server) |
| Storage | IPFS (Helia / Kubo), Hedera Consensus Service, Hedera Token Service |
| DevOps | PM2, Docker, Jest |

---

## Environment Setup

### contracts/.env

```
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
PRIVATE_KEY=<deployer-private-key>
```

### server/.env

```
MONGO_URI=mongodb://localhost:27017/
HEDERA_RPC_URL=https://testnet.hashio.io/api
PRIVY_APP_ID=<privy-app-id>
PRIVY_APP_SECRET=<privy-app-secret>
ADMIN_PRIVATE_KEY=<admin-private-key>
ADMIN_WALLET=<admin-wallet-address>
HEDERA_OPERATOR_ID=<hedera-account-id>
HEDERA_OPERATOR_KEY=<hedera-private-key>
HCS_TOPIC_ID=<hcs-topic-id>
HTS_BADGE_TOKEN_ID=<hts-token-id>
IPFS_API=http://localhost:5001/api/v0
IPFS_GATEWAY=http://127.0.0.1:8080/ipfs
# + all 6 contract addresses
```

### web/.env

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_PRIVY_APP_ID=<privy-app-id>
NEXT_PUBLIC_IPFS_GATEWAY=http://127.0.0.1:8080/ipfs
# + 5 contract addresses (NEXT_PUBLIC_ prefixed)
```

See `.env.template` files in each directory for the full list.

---

## Deployed Contracts (Hedera Testnet)

| Contract | Address |
|----------|---------|
| Treasury | `0xf114913542ad1c6c86dbd4aff2353d75595221f6` |
| Herena (HRN) | `0x9cd3ab002fc4160e0539f9f5e1499c847b750da4` |
| StakingManager | `0xfaf4e9c1abe735236684f1604c5e89c2f0efbfdb` |
| TaskManager | `0x6d5072f10ac699a71c6ba02026966bdbb47d2c5b` |
| ProofManager | `0x389a6f336f9fd2738654a0a729b7cea0e140436d` |
| VotingManager | `0x1b62e8c40b090b1b96dbf31ce53d4ed4356e071e` |
| SwapPool | `0x464391dd12a8c9cb48115c836d27cfd4ab880a33` |

---

## License

MIT
