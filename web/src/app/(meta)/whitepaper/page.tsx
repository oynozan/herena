import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import Mermaid from "@/components/Mermaid";
import TokenomicsChart from "@/components/TokenomicsChart";

export default function Whitepaper() {
    return (
        <div className="container max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">
                Herena Protocol
            </h1>
            <p className="text-lg text-muted-foreground mb-1">
                Decentralized Sustainability Verification on Hedera
            </p>
            <p className="text-sm text-muted-foreground mb-8">
                Technical Whitepaper v1.1.0
            </p>

            {/* ── Abstract ──────────────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">Abstract</h2>
                <p className="leading-relaxed">
                    Herena is a decentralized protocol built on the Hedera network that
                    incentivizes and verifies real-world sustainability actions through
                    community-driven governance. Volunteers complete environmental tasks,
                    submit cryptographic proof of completion to IPFS, and undergo a
                    quadratic voting process where staked community members validate the
                    work. Upon approval, rewards are autonomously distributed: 80% to the
                    task completer and 20% to the verifying voters. The protocol&apos;s native
                    token, HRN, serves as the medium of reward, staking, and governance
                    participation, and is exchangeable with HBAR through a built-in
                    constant-product automated market maker.
                </p>
            </section>

            {/* ── 1. Introduction ───────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
                <p className="mb-4 leading-relaxed">
                    Climate change and environmental degradation demand coordinated action
                    at scale. While individuals and organizations increasingly seek to
                    contribute, a fundamental trust problem persists: there is no widely
                    accepted, tamper-proof mechanism to verify that environmental actions
                    have actually occurred. Self-reporting is prone to fraud, centralized
                    auditing is expensive and unscalable, and existing carbon credit markets
                    are opaque.
                </p>
                <p className="mb-4 leading-relaxed">
                    Herena addresses this gap by constructing a transparent,
                    blockchain-based verification pipeline. Sustainability tasks are
                    published on-chain, completed by volunteers in the physical world,
                    documented with rich-media proof stored on IPFS, and validated through
                    decentralized community governance. Every step &mdash; from task
                    creation to reward distribution &mdash; is recorded immutably on the
                    Hedera ledger.
                </p>
                <p className="leading-relaxed">
                    The protocol is composed of six interconnected smart contracts deployed
                    on Hedera&apos;s EVM-compatible layer: a Treasury, an ERC-20 token
                    (HRN), a TaskManager, a ProofManager, a VotingManager, and a SwapPool.
                    Together, they form a self-contained economy for sustainability
                    verification.
                </p>
            </section>

            {/* ── 2. Protocol Architecture ──────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">2. Protocol Architecture</h2>
                <p className="mb-4 leading-relaxed">
                    The Herena protocol consists of six core contracts that interact in a
                    defined lifecycle:
                </p>
                <Mermaid chart={`graph TD
    Treasury["Treasury<br/><small>HRN Reserves</small>"]
    TaskManager["TaskManager<br/><small>Tasks & Rewards</small>"]
    ProofManager["ProofManager<br/><small>Proof Submissions</small>"]
    VotingManager["VotingManager<br/><small>Quadratic Voting</small>"]
    StakingManager["StakingManager<br/><small>Stake & Power</small>"]
    SwapPool["SwapPool<br/><small>HRN / HBAR AMM</small>"]
    Volunteer(["Volunteer"])
    Voter(["Voter"])

    Treasury -- "funds tasks" --> TaskManager
    TaskManager -- "rewards" --> VotingManager
    Volunteer -- "submits proof" --> ProofManager
    ProofManager -- "creates proposal" --> VotingManager
    Voter -- "stakes HRN" --> StakingManager
    StakingManager -. "voting power" .-> VotingManager
    Voter -- "swaps HBAR ↔ HRN" --> SwapPool

    style Treasury fill:#0f172a,stroke:#22c55e,color:#e2e8f0
    style TaskManager fill:#0f172a,stroke:#22c55e,color:#e2e8f0
    style ProofManager fill:#0f172a,stroke:#22c55e,color:#e2e8f0
    style VotingManager fill:#0f172a,stroke:#22c55e,color:#e2e8f0
    style StakingManager fill:#0f172a,stroke:#22c55e,color:#e2e8f0
    style SwapPool fill:#0f172a,stroke:#22c55e,color:#e2e8f0
    style Volunteer fill:#1e293b,stroke:#64748b,color:#e2e8f0
    style Voter fill:#1e293b,stroke:#64748b,color:#e2e8f0
`} />
                <ul className="list-disc ml-6 space-y-2 leading-relaxed">
                    <li>
                        <b>Treasury:</b> Custodian of the protocol&apos;s HRN reserves.
                        Funds are transferred to the TaskManager when tasks are created.
                    </li>
                    <li>
                        <b>Herena (HRN):</b> An ERC-20 token with a fixed initial supply
                        of 1,000,000 HRN, minted entirely to the Treasury at deployment.
                    </li>
                    <li>
                        <b>TaskManager:</b> Stores task definitions on-chain, holds
                        pre-funded reward budgets, and tracks completion counts.
                    </li>
                    <li>
                        <b>ProofManager:</b> Accepts proof submissions referencing IPFS
                        URIs and automatically triggers governance proposals.
                    </li>
                    <li>
                        <b>VotingManager:</b> Runs time-bounded quadratic voting on each
                        proof submission and distributes rewards upon approval.
                    </li>
                    <li>
                        <b>StakingManager:</b> Manages HRN staking positions and computes
                        quadratic voting power.
                    </li>
                    <li>
                        <b>SwapPool:</b> A constant-product AMM enabling HRN/HBAR
                        exchange with LP token mechanics.
                    </li>
                </ul>
            </section>

            {/* ── 3. Task Lifecycle ─────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">3. Task Lifecycle</h2>

                <h3 className="text-xl font-medium mb-2 mt-4">3.1 Task Creation</h3>
                <p className="mb-4 leading-relaxed">
                    The protocol administrator publishes sustainability tasks through the
                    TaskManager contract. Each task is defined by six parameters stored
                    on-chain:
                </p>
                <ul className="list-disc ml-6 space-y-2 leading-relaxed">
                    <li>
                        <b>Description:</b> A concise summary of the required action
                        (e.g., &ldquo;Plant 100 trees in community park&rdquo;)
                    </li>
                    <li>
                        <b>Metadata URI:</b> An IPFS-hosted document containing detailed
                        requirements, acceptance criteria, and supplementary media, rendered
                        as rich text on the platform
                    </li>
                    <li>
                        <b>Reward per completion:</b> The HRN amount awarded for each
                        verified completion
                    </li>
                    <li>
                        <b>Maximum completions:</b> The total number of participants that
                        can complete the task
                    </li>
                    <li>
                        <b>Deadline:</b> The UNIX timestamp after which submissions are
                        no longer accepted
                    </li>
                </ul>
                <p className="mt-4 mb-4 leading-relaxed">
                    At creation time, the full reward budget
                    (<InlineMath math="\text{reward} \times \text{maxCompletions}" />) is
                    transferred from the Treasury to the TaskManager, ensuring that approved
                    submissions are always fully funded. If a task is cancelled before all
                    slots are filled, unused funds are returned to the Treasury.
                </p>

                <h3 className="text-xl font-medium mb-2 mt-6">3.2 Proof Submission</h3>
                <p className="mb-4 leading-relaxed">
                    Volunteers complete the real-world action and submit proof through the
                    ProofManager. The proof artifact &mdash; which may include photos, text,
                    and other evidence &mdash; is structured as a TipTap rich-text JSON
                    document, uploaded to IPFS, and referenced on-chain by its content
                    identifier (CID).
                </p>
                <p className="mb-4 leading-relaxed">
                    The protocol enforces a <b>one submission per user per task</b> constraint
                    on-chain, preventing duplicate claims. Upon successful submission, the
                    ProofManager automatically calls the VotingManager to create a
                    governance proposal for community review.
                </p>

                <h3 className="text-xl font-medium mb-2 mt-6">3.3 Verification &amp; Resolution</h3>
                <p className="mb-4 leading-relaxed">
                    Each proof submission triggers a time-bounded voting period (default: 48
                    hours). Community members with staked HRN review the proof and cast
                    either an approval or rejection vote. Voting power is determined by the
                    quadratic formula described in Section 4.
                </p>
                <p className="leading-relaxed">
                    After the voting period ends, anyone may call the permissionless{" "}
                    <code>resolveProposal</code> function. If approval votes exceed
                    rejection votes, the task completion count is incremented and rewards
                    are distributed. If the proposal is rejected, no rewards are paid and
                    the completion slot is not consumed.
                </p>
            </section>

            {/* ── 4. Quadratic Voting ───────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">4. Quadratic Voting</h2>
                <p className="mb-4 leading-relaxed">
                    Herena employs quadratic voting to prevent plutocratic capture of the
                    verification process. Rather than using a one-token-one-vote model where
                    large holders can unilaterally control outcomes, the protocol computes
                    voting power as the square root of staked tokens:
                </p>

                <div className="border border-border rounded-lg p-4 bg-background mb-4">
                    <BlockMath math="P(s) = \lfloor\sqrt{s}\rfloor" />
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        where <InlineMath math="s" /> is the amount of HRN staked (in
                        token units)
                    </p>
                </div>

                <p className="mb-4 leading-relaxed">
                    This creates a diminishing-returns curve: each additional unit of
                    influence requires quadratically more capital. The practical effect is
                    that many small stakeholders collectively outweigh a single large
                    stakeholder.
                </p>

                <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">Voting Power Table</h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted">
                                    <th className="text-left p-3 font-medium">HRN Staked</th>
                                    <th className="text-left p-3 font-medium">Voting Power</th>
                                    <th className="text-left p-3 font-medium">Marginal Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t border-border">
                                    <td className="p-3">1</td>
                                    <td className="p-3">1</td>
                                    <td className="p-3">1 HRN per vote</td>
                                </tr>
                                <tr className="border-t border-border">
                                    <td className="p-3">4</td>
                                    <td className="p-3">2</td>
                                    <td className="p-3">3 HRN for 2nd vote</td>
                                </tr>
                                <tr className="border-t border-border">
                                    <td className="p-3">100</td>
                                    <td className="p-3">10</td>
                                    <td className="p-3">19 HRN for 10th vote</td>
                                </tr>
                                <tr className="border-t border-border">
                                    <td className="p-3">10,000</td>
                                    <td className="p-3">100</td>
                                    <td className="p-3">199 HRN for 100th vote</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <p className="leading-relaxed">
                    Voters must maintain a minimum stake of 1 HRN to participate. Each
                    voter may cast a single vote (approve or reject) per proposal, and their
                    full quadratic voting power is applied. Staked tokens are not consumed by
                    voting &mdash; they remain staked and continue accumulating power across
                    proposals.
                </p>
            </section>

            {/* ── 5. Reward Distribution ────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">5. Reward Distribution</h2>
                <p className="mb-4 leading-relaxed">
                    When a proposal is approved, the task&apos;s reward per completion is
                    distributed according to a fixed 80/20 split:
                </p>

                <div className="border border-border rounded-lg p-4 bg-background mb-4">
                    <BlockMath math="R_{\text{submitter}} = \left\lfloor\frac{R \cdot 80}{100}\right\rfloor" />
                    <BlockMath math="R_{\text{voters}} = R - R_{\text{submitter}}" />
                </div>

                <ul className="list-disc ml-6 space-y-2 mb-4 leading-relaxed">
                    <li>
                        <b>80% to the proof submitter</b> &mdash; the volunteer who
                        completed the sustainability task
                    </li>
                    <li>
                        <b>20% to approving voters</b> &mdash; distributed proportionally
                        to each voter&apos;s quadratic voting power
                    </li>
                </ul>

                <p className="mb-4 leading-relaxed">
                    The voter reward for each approving voter <InlineMath math="i" /> is:
                </p>

                <div className="border border-border rounded-lg p-4 bg-background mb-4">
                    <BlockMath math="r_i = \left\lfloor\frac{R_{\text{voters}} \cdot P_i}{\sum_{j \in A} P_j}\right\rfloor" />
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        where <InlineMath math="A" /> is the set of approve voters
                        and <InlineMath math="P_i" /> is voter <InlineMath math="i" />&apos;s
                        quadratic voting power
                    </p>
                </div>

                <p className="leading-relaxed">
                    This mechanism incentivizes honest verification: voters are financially
                    rewarded for correctly validating genuine sustainability work, while
                    approving fraudulent submissions risks reputation damage and loss of
                    future rewards if the broader community catches on.
                </p>
            </section>

            {/* ── 6. HRN Token ──────────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">6. HRN Token</h2>

                <h3 className="text-xl font-medium mb-2">6.1 Token Specification</h3>
                <div className="border border-border rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-border">
                                <td className="p-3 font-medium bg-muted w-1/3">Name</td>
                                <td className="p-3">Herena</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="p-3 font-medium bg-muted">Symbol</td>
                                <td className="p-3">HRN</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="p-3 font-medium bg-muted">Standard</td>
                                <td className="p-3">ERC-20 (with ERC-20 Burnable extension)</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="p-3 font-medium bg-muted">Decimals</td>
                                <td className="p-3">18</td>
                            </tr>
                            <tr className="border-b border-border">
                                <td className="p-3 font-medium bg-muted">Initial Supply</td>
                                <td className="p-3">1,000,000 HRN</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium bg-muted">Minting</td>
                                <td className="p-3">Fixed supply &mdash; no additional minting function exposed</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3 className="text-xl font-medium mb-2 mt-6">6.2 Token Utility</h3>
                <ul className="list-disc ml-6 space-y-2 leading-relaxed">
                    <li>
                        <b>Task rewards:</b> Distributed to volunteers upon verified
                        completion of sustainability tasks
                    </li>
                    <li>
                        <b>Voter rewards:</b> Earned by stakers who participate in
                        governance verification
                    </li>
                    <li>
                        <b>Staking:</b> Required to participate in DAO governance; minimum
                        stake is 1 HRN
                    </li>
                    <li>
                        <b>Burn:</b> Token holders may permanently burn HRN, reducing
                        total supply
                    </li>
                </ul>

                <h3 className="text-xl font-medium mb-2 mt-6">6.3 Staking Mechanics</h3>
                <p className="mb-4 leading-relaxed">
                    Users stake HRN into the StakingManager contract to gain voting power.
                    Staking and unstaking are immediate with no lockup period, except that
                    unstaking is blocked while the user has active (unresolved) proposals to
                    prevent vote manipulation. The minimum stake threshold of 1 HRN ensures
                    a meaningful economic commitment from all participants.
                </p>

                <h3 className="text-xl font-medium mb-2 mt-6">6.4 Token Distribution</h3>
                <p className="mb-4 leading-relaxed">
                    The entire supply of 1,000,000 HRN is minted to the Treasury contract
                    at deployment. Tokens flow into the economy through two initial
                    channels:
                </p>

                <TokenomicsChart />

                <div className="border border-border rounded-lg overflow-hidden my-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted">
                                <th className="text-left p-3 font-medium">Allocation</th>
                                <th className="text-left p-3 font-medium">Amount</th>
                                <th className="text-left p-3 font-medium">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-border">
                                <td className="p-3 font-medium">Task Rewards</td>
                                <td className="p-3">792,000 HRN (79.2%)</td>
                                <td className="p-3">
                                    Paid to volunteers who complete and verify sustainability
                                    tasks (80% of the 990,000 disbursable pool)
                                </td>
                            </tr>
                            <tr className="border-t border-border">
                                <td className="p-3 font-medium">Voter Rewards</td>
                                <td className="p-3">198,000 HRN (19.8%)</td>
                                <td className="p-3">
                                    Distributed proportionally to stakers who approve valid
                                    proofs (20% of the 990,000 disbursable pool)
                                </td>
                            </tr>
                            <tr className="border-t border-border">
                                <td className="p-3 font-medium">AMM Liquidity</td>
                                <td className="p-3">10,000 HRN (1%)</td>
                                <td className="p-3">
                                    Seeded into the HRN/HBAR SwapPool at genesis alongside
                                    100 HBAR, establishing an initial exchange rate
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p className="mb-4 leading-relaxed">
                    Tokens remain in the Treasury until tasks are created. At task creation,
                    the full reward budget
                    (<InlineMath math="\text{reward} \times \text{maxCompletions}" />) is
                    transferred to the TaskManager. Upon approval, 80% flows to the
                    volunteer and 20% is split among approving voters proportionally to
                    their quadratic voting power. If a task is cancelled before all slots
                    are filled, unused funds are returned to the Treasury, ensuring no
                    tokens are lost.
                </p>
                <p className="leading-relaxed">
                    This model ensures that every HRN token entering circulation is backed
                    by a verified sustainability action. There is no team allocation, no
                    vesting schedule, and no inflationary mechanism &mdash; the fixed supply
                    is distributed purely through participation in the protocol.
                </p>
            </section>

            {/* ── 7. Automated Market Maker ─────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">7. HRN / HBAR Swap Pool</h2>
                <p className="mb-4 leading-relaxed">
                    The protocol includes a built-in constant-product automated market maker
                    (AMM) enabling users to exchange between HRN and native HBAR. This
                    facilitates frictionless onboarding without dependence on external
                    exchanges.
                </p>

                <h3 className="text-xl font-medium mb-2">7.1 Pricing Formula</h3>
                <p className="mb-4 leading-relaxed">
                    The swap pool maintains the constant-product invariant:
                </p>
                <div className="border border-border rounded-lg p-4 bg-background mb-4">
                    <BlockMath math="x \cdot y = k" />
                    <p className="text-sm text-muted-foreground text-center mt-2">
                        where <InlineMath math="x" /> = HBAR reserve, <InlineMath math="y" /> = HRN
                        reserve, <InlineMath math="k" /> = invariant constant
                    </p>
                </div>
                <p className="mb-4 leading-relaxed">
                    A 0.3% fee is collected on each swap by applying a 997/1000 multiplier
                    to the input amount before computing the output:
                </p>
                <div className="border border-border rounded-lg p-4 bg-background mb-4">
                    <BlockMath math="\Delta y = \frac{(\Delta x \cdot 997) \cdot y}{x \cdot 1000 + \Delta x \cdot 997}" />
                </div>

                <h3 className="text-xl font-medium mb-2 mt-6">7.2 Liquidity Provision</h3>
                <p className="mb-4 leading-relaxed">
                    Liquidity providers deposit HRN and HBAR in equal proportion and receive
                    HRN-LP tokens representing their pool share. The initial LP mint uses
                    the geometric mean:
                </p>
                <div className="border border-border rounded-lg p-4 bg-background mb-4">
                    <BlockMath math="LP_{\text{initial}} = \sqrt{\Delta x \cdot \Delta y}" />
                </div>
                <p className="leading-relaxed">
                    Subsequent deposits must maintain the exact reserve ratio. Withdrawal is
                    proportional: burning LP tokens returns the corresponding share of both
                    HBAR and HRN reserves.
                </p>
            </section>

            {/* ── 8. Off-Chain Data ─────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">8. Off-Chain Data Layer</h2>
                <p className="mb-4 leading-relaxed">
                    The protocol uses IPFS as its decentralized storage layer for all
                    content that is too large or complex for on-chain storage:
                </p>
                <ul className="list-disc ml-6 space-y-2 leading-relaxed">
                    <li>
                        <b>Task metadata:</b> Detailed task descriptions, requirements,
                        and acceptance criteria are stored as structured TipTap JSON
                        documents on IPFS and referenced on-chain via a{" "}
                        <code>metadataURI</code> field in the Task struct
                    </li>
                    <li>
                        <b>Proof artifacts:</b> Rich-text documents containing photos,
                        descriptions, and evidence of task completion, stored on IPFS and
                        referenced via <code>proofURI</code> in the Proof struct
                    </li>
                </ul>
                <p className="mt-4 leading-relaxed">
                    All IPFS references use content-addressed identifiers (CIDs), ensuring
                    data integrity: the hash of the content serves as its address, making
                    tampering detectable. The platform resolves these URIs through an IPFS
                    gateway and renders the content as rich text with embedded images.
                </p>
            </section>

            {/* ── 9. Governance & Admin ─────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">9. Protocol Governance</h2>
                <p className="mb-4 leading-relaxed">
                    The protocol includes administrative functions gated by
                    OpenZeppelin&apos;s <code>Ownable</code> pattern. The contract owner
                    (deployer) has the ability to:
                </p>
                <ul className="list-disc ml-6 space-y-2 leading-relaxed">
                    <li>
                        Create and cancel sustainability tasks
                    </li>
                    <li>
                        Adjust the voting duration for future proposals
                    </li>
                    <li>
                        Delete unresolved proposals in exceptional circumstances
                    </li>
                    <li>
                        Update the minimum staking threshold
                    </li>
                    <li>
                        Pause task creation in emergencies
                    </li>
                    <li>
                        Withdraw funds from the Treasury
                    </li>
                </ul>
                <p className="mt-4 leading-relaxed">
                    These administrative capabilities are exposed through authenticated API
                    endpoints protected by ES256 JWT verification. Proposal resolution, by
                    contrast, is fully permissionless &mdash; any address may trigger reward
                    distribution after the voting period concludes.
                </p>
            </section>

            {/* ── 10. HCS Audit Trail ────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">10. Hedera Consensus Service Audit Trail</h2>
                <p className="mb-4 leading-relaxed">
                    Beyond the on-chain smart contract state, Herena leverages the Hedera
                    Consensus Service (HCS) to maintain an immutable, timestamped audit log
                    of all significant protocol events. While smart contracts record state
                    transitions, HCS provides a sequential, human-readable narrative of
                    platform activity that is independently verifiable by any third party.
                </p>

                <h3 className="text-xl font-medium mb-2 mt-4">10.1 How It Works</h3>
                <p className="mb-4 leading-relaxed">
                    The Herena backend operates a Hedera native account that acts as the
                    audit trail publisher. When the event synchronization service detects
                    on-chain events (proof submissions, votes, proposal resolutions, badge
                    awards), it submits a structured JSON message to a dedicated HCS topic
                    via <code>TopicMessageSubmitTransaction</code>. Each message receives
                    a consensus timestamp from the Hedera network, providing a
                    cryptographic proof of when the event was recorded.
                </p>

                <h3 className="text-xl font-medium mb-2 mt-4">10.2 Logged Events</h3>
                <ul className="list-disc ml-6 space-y-2 leading-relaxed">
                    <li>
                        <b>proof_submitted:</b> Records proof ID, task ID, and submitter
                        address when a volunteer submits evidence of task completion
                    </li>
                    <li>
                        <b>voted:</b> Records proposal ID, voter address, vote direction
                        (approve/reject), and quadratic voting power applied
                    </li>
                    <li>
                        <b>proposal_resolved:</b> Records proposal ID and final outcome
                        (approved or rejected) when a governance vote concludes
                    </li>
                    <li>
                        <b>badge_awarded:</b> Records user address, badge type, and
                        badge name when an impact badge is earned
                    </li>
                </ul>

                <h3 className="text-xl font-medium mb-2 mt-6">10.3 Design Principles</h3>
                <p className="leading-relaxed">
                    HCS logging is non-blocking and best-effort &mdash; failures in audit
                    trail submission never interrupt core protocol operations such as event
                    processing or reward distribution. The HCS topic is configured with a
                    submit key restricted to the server&apos;s operator account, preventing
                    unauthorized message injection while keeping all messages publicly
                    readable. Any observer can independently query the HCS topic on a
                    Hedera mirror node to reconstruct the complete history of protocol
                    activity.
                </p>
            </section>

            {/* ── 11. Impact Badges ──────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">11. Impact Badges</h2>
                <p className="mb-4 leading-relaxed">
                    Herena rewards sustained participation through a system of Impact
                    Badges &mdash; non-fungible tokens (NFTs) minted on the Hedera Token
                    Service (HTS) that serve as permanent, on-chain credentials of a
                    user&apos;s contributions to sustainability verification.
                </p>

                <h3 className="text-xl font-medium mb-2 mt-4">11.1 Badge Criteria</h3>
                <div className="border border-border rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted">
                                <th className="text-left p-3 font-medium">Badge</th>
                                <th className="text-left p-3 font-medium">Trigger</th>
                                <th className="text-left p-3 font-medium">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-border">
                                <td className="p-3">First Submission</td>
                                <td className="p-3">Submit 1st proof</td>
                                <td className="p-3">Awarded when a user submits their first proof of impact</td>
                            </tr>
                            <tr className="border-t border-border">
                                <td className="p-3">First Approval</td>
                                <td className="p-3">1st proof approved</td>
                                <td className="p-3">Awarded when a user&apos;s proof is approved by the community for the first time</td>
                            </tr>
                            <tr className="border-t border-border">
                                <td className="p-3">First Stake</td>
                                <td className="p-3">Stake &ge; 10 HRN</td>
                                <td className="p-3">Awarded when a user&apos;s net staked balance reaches 10 HRN</td>
                            </tr>
                            <tr className="border-t border-border">
                                <td className="p-3">First Vote</td>
                                <td className="p-3">Cast 1st vote</td>
                                <td className="p-3">Awarded when a user casts their first governance vote</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3 className="text-xl font-medium mb-2 mt-6">11.2 Minting Process</h3>
                <p className="mb-4 leading-relaxed">
                    When a badge trigger is detected during event synchronization, the
                    server awards the badge through a three-step process:
                </p>
                <ol className="list-decimal ml-6 space-y-2 mb-4 leading-relaxed">
                    <li>
                        <b>Database record:</b> The badge is persisted to MongoDB with the
                        user&apos;s wallet address, badge type, and timestamp. This serves
                        as the authoritative source of truth for badge ownership.
                    </li>
                    <li>
                        <b>HCS audit log:</b> A <code>badge_awarded</code> message is
                        published to the audit trail topic.
                    </li>
                    <li>
                        <b>HTS NFT mint:</b> A non-fungible token is minted on the Hedera
                        Token Service under the &ldquo;Herena Impact Badge&rdquo;
                        (HBADGE) collection. The NFT metadata encodes the badge type and
                        description. The resulting transaction ID and serial number are
                        stored alongside the database record, providing a direct link to
                        the on-chain asset viewable on HashScan.
                    </li>
                </ol>
                <p className="leading-relaxed">
                    HTS minting is best-effort &mdash; if the Hedera native service is
                    unavailable or unconfigured, the badge is still awarded in the database
                    and displayed in the user interface. Each badge type can only be earned
                    once per user, enforced by a unique compound index
                    on <code>(user, badgeType)</code>.
                </p>
            </section>

            {/* ── 12. Why Hedera ──────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">12. Why Hedera</h2>
                <p className="mb-4 leading-relaxed">
                    Herena is deployed on the Hedera network for its alignment with the
                    protocol&apos;s sustainability mission and technical requirements:
                </p>
                <ul className="list-disc ml-6 space-y-2 leading-relaxed">
                    <li>
                        <b>Carbon-negative consensus:</b> Hedera&apos;s hashgraph
                        consensus mechanism is energy-efficient and carbon-negative,
                        directly aligning with the protocol&apos;s environmental objectives
                    </li>
                    <li>
                        <b>EVM compatibility:</b> Full Solidity support via the Hedera
                        JSON-RPC relay, enabling standard tooling (Hardhat, ethers.js, viem)
                    </li>
                    <li>
                        <b>Transaction finality:</b> Near-instant finality ensures a
                        responsive user experience for proof submissions and voting
                    </li>
                    <li>
                        <b>Low fees:</b> Predictable, low-cost transactions make
                        micro-rewards and frequent governance participation economically
                        viable
                    </li>
                    <li>
                        <b>Immutable audit trail:</b> All task completions, votes, and
                        token transfers are permanently recorded on the Hedera ledger.
                        Additionally, every significant event is logged to the Hedera
                        Consensus Service (see Section 10), creating a sequential,
                        independently verifiable record of verified environmental impact
                    </li>
                    <li>
                        <b>Native token services:</b> HTS enables Impact Badges to be
                        minted as true Hedera-native NFTs (see Section 11) without
                        deploying custom NFT contracts
                    </li>
                </ul>
            </section>

            {/* ── 13. Summary Formulas ──────────────────────────── */}
            <section className="mb-16">
                <h2 className="text-2xl font-semibold mb-4">13. Core Formulas</h2>
                <div className="border border-border rounded-lg p-6 bg-background space-y-6">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Quadratic Voting Power</p>
                        <BlockMath math="P(s) = \lfloor\sqrt{s}\rfloor \quad \text{where } s = \text{staked HRN}" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Reward Distribution</p>
                        <BlockMath math="R_{\text{submitter}} = 0.8R, \quad R_{\text{voters}} = 0.2R, \quad r_i = \frac{R_{\text{voters}} \cdot P_i}{\sum_{j \in A} P_j}" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">AMM Constant Product</p>
                        <BlockMath math="x \cdot y = k, \quad \Delta y = \frac{0.997 \cdot \Delta x \cdot y}{x + 0.997 \cdot \Delta x}" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Initial LP Mint</p>
                        <BlockMath math="LP = \sqrt{\Delta x \cdot \Delta y}" />
                    </div>
                </div>
            </section>
        </div>
    );
}
