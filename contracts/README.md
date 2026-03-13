# Herena Smart Contracts

A proof-based task completion and quadratic voting protocol running on Hedera.

## Contract Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Treasury (Contract)                      │
│                 Initial token supply is minted here             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ fundTask (task reward transfer)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Herena.sol (HRN Token)                      │
│         ERC20 · Burnable · Ownable · initialMint → treasury       │
└───────────────┬──────────────────────────────────────────────────┘
                │ IERC20
     ┌──────────┼──────────────────────────────────┐
     │          │                                  │
     ▼          ▼                                  ▼
┌──────────┐ ┌──────────────────────┐    ┌──────────────────────┐
│Staking   │ │    TaskManager       │    │     SwapPool         │
│Manager   │ │                      │    │  (HBAR <-> HRN AMM)  │
│          │ │ - Create task        │    │  x*y=k, 0.3% fee     │
│ stake()  │ │ - Lock reward        │    │                      │
│ unstake()│ │ - Count completion   │    │  ┌─────────────────┐ │
│ sqrt()   │ │ - Cancel & refund    │    │  │   LPToken       │ │
│  voting  │ │                      │    │  │ (HRN-LP ERC20)  │ │
│  power   │ └──────┬───────────────┘    │  └─────────────────┘ │
└──────┬───┘        │ getTask()          └──────────────────────┘
       │            │ isTaskActive()
       │            │ incrementCompletion()
       │            │ token.transferFrom(taskManager -> submitter/voter)
       │            │
       │     ┌──────▼──────────────┐
       │     │    ProofManager     │
       │     │                     │
       │     │ - Submit proof      │
       │     │ - Verify task       │
       │     │ - Create proposal   │
       │     └──────┬──────────────┘
       │            │ createProposal(proofId)
       │            ▼
       │     ┌──────────────────────┐
       └────►│   VotingManager      │
             │                      │
             │ - Open proposal      │
             │ - Vote (sqrt)        │
             │ - Resolve proposal   │
             │ - Distribute reward  │
             │   80% -> submitter   │
             │   20% -> approve voters
             └──────────────────────┘
```

## Contracts

### [Herena.sol](contracts/Herena.sol) — HRN Token

The platform's native ERC20 token.

- Uses OpenZeppelin `ERC20`, `ERC20Burnable`, `Ownable`.
- `initialTreasuryMint` is minted to the `treasury` address on deploy.
- The owner can mint later.
- **Treasury is a contract that controls task funding** (see [Treasury](#treasury-solcontract--treasury)).

---

### [Treasury.sol](contracts/Treasury.sol) — Treasury

On-chain treasury that holds HRN and funds TaskManager.

**Key functions:**

| Function | Who calls | What it does |
|---|---|---|
| `fundTask(amount)` | TaskManager | Transfers HRN to TaskManager for a task reward |
| `setTaskManager(address)` | Owner | Sets the authorized TaskManager |
| `setMaxTaskReward(amount)` | Owner | Optional per-task reward cap (0 = no cap) |
| `withdraw(to, amount)` | Owner | Withdraws treasury funds |

**Dependencies:** HRN Token, TaskManager

---

### [TaskManager.sol](contracts/TaskManager.sol) — Task Manager

Manages task creation and reward locking.

**Key functions:**

| Function | Who calls | What it does |
|---|---|---|
| `createTask(...)` | Owner | Calls `Treasury.fundTask` and locks `rewardPerCompletion × maxCompletions` HRN |
| `incrementCompletion(taskId)` | ProofManager or VotingManager | Increments completion count and deactivates task when full |
| `cancelTask(taskId)` | Owner | Cancels the task and refunds remaining rewards to treasury |

**Dependencies:** HRN Token, Treasury contract, ProofManager, VotingManager

---

### [ProofManager.sol](contracts/ProofManager.sol) — Proof Manager

Stores on-chain proof submissions for task completion.

**Key functions:**

| Function | Who calls | What it does |
|---|---|---|
| `submitProof(taskId, proofURI)` | Any user | Stores proof (IPFS/Arweave URI) and opens a proposal in VotingManager |

**Rules:**
- A user can submit only one proof per task.
- The task must be active and not at its completion limit.
- VotingManager must be set.

**Dependencies:** TaskManager, VotingManager

---

### [VotingManager.sol](contracts/VotingManager.sol) — Voting & Reward Distribution

Evaluates proofs with quadratic voting and distributes rewards.

**Flow:**
1. ProofManager calls `createProposal(proofId)`
2. Stakers vote via `vote(proposalId, approve)`
3. After the voting period ends, anyone can call `resolveProposal(proposalId)`
4. If approved:
   - `incrementCompletion` is called on TaskManager
   - **80%** of the reward goes to the submitter
   - **20%** is shared among "approve" voters proportional to their voting power

**Voting power:** `sqrt(stakedAmount)` — quadratic voting to reduce whale influence.

**Dependencies:** HRN Token, StakingManager, TaskManager, ProofManager

---

### [StakingManager.sol](contracts/StakingManager.sol) — Staking Manager

Stake HRN to gain voting power.

| Function | What it does |
|---|---|
| `stake(amount)` | Locks HRN in the contract |
| `unstake(amount)` | Returns tokens if no active proposal |
| `getVotingPower(user)` | Returns `sqrt(stakedAmount)` |

**Note:** If VotingManager is set, active proposal checks are enforced before unstake.

---

### [SwapPool.sol](contracts/SwapPool.sol) — AMM Swap Pool

Constant-product AMM that enables HRN ↔ HBAR (native coin) swaps.

| Function | What it does |
|---|---|
| `addLiquidity(tokenAmount)` | Adds HRN + HBAR, mints LP tokens |
| `removeLiquidity(lpAmount)` | Burns LP tokens, returns HRN + HBAR |
| `swapHBARForToken(minOut)` | Send HBAR → receive HRN |
| `swapTokenForHBAR(amount, minOut)` | Send HRN → receive HBAR |

- Formula: `x * y = k` (constant product)
- Fee: **0.3%** (997/1000)
- Initial liquidity: `sqrt(tokenAmount × hbarAmount)` LP tokens are minted.

**Dependencies:** HRN Token, LPToken (auto-deployed during deployment)

---

### [LPToken.sol](contracts/LPToken.sol) — Liquidity Provider Token

Simple ERC20 owned by SwapPool.

- `mint` and `burn` can be called only by the owner (SwapPool).
- Users can transfer tokens.

---

### [mocks/MockVotingManager.sol](contracts/mocks/MockVotingManager.sol) — Test Mock

Minimal VotingManager mock used only in tests.

- Simulates the `createProposal` interface without deploying the full VotingManager stack.
- **Not deployed in production.**

---

## Deployment Order

```
1. Herena           (treasury, initialMint)
2. Treasury         (token)
3. StakingManager   (token)
4. TaskManager      (token, treasury)
5. ProofManager     (taskManager)
6. VotingManager    (token, stakingManager, taskManager, proofManager, duration)
7. SwapPool         (token)              → auto-deploys LPToken

Setup steps:
8.  Treasury.setTaskManager(taskManager)
9.  TaskManager.setProofManager(proofManager)
10. TaskManager.setVotingManager(votingManager, type(uint256).max)
11. ProofManager.setVotingManager(votingManager)
12. StakingManager.setVotingManager(votingManager)
13. Ensure Treasury is funded with HRN (mint or transfer)
```

---

## Tests

```bash
npm run test
```

Test files:

| File | What it tests |
|---|---|
| `Herena.test.ts` | Token mint, zero-check |
| `TaskManager.test.ts` | Task creation, completion, cancellation |
| `ProofManager.test.ts` | Proof submission, duplication guard, mock integration |
| `VotingManager.test.ts` | Voting, reward distribution |
| `StakingManager.test.ts` | Stake, unstake, quadratic power |
| `SwapPool.test.ts` | AMM liquidity, swap, slippage |
| `Integration.test.ts` | End-to-end flow |
| `Treasury.test.ts` | Treasury funding, caps, withdrawals |
