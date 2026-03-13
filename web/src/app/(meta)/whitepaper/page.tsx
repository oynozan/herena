import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

export default function Whitepaper() {
    return (
        <div className="container">
            <h1 className="text-3xl font-bold mb-4">
                Herena - Decentralized Sustainability Verification
            </h1>
            <i>Concept Paper v0.1.0</i>

            <section className="mt-4">
                <p>
                    <b>Abstract:</b> Herena is a decentralized platform built on the Hedera network
                    that incentivizes and verifies real-world sustainability actions through
                    community governance. The platform uses a DAO-based verification system with
                    quadratic voting to validate environmental contributions, rewarding participants
                    with RN tokens.
                </p>
            </section>

            <section className="mt-4">
                <h2 className="text-2xl font-semibold mb-2">1. Vision</h2>
                <p className="mb-4">
                    Climate change and environmental degradation require coordinated action at
                    scale. While many individuals and organizations want to contribute to
                    sustainability, there is a fundamental trust problem: how can we verify that
                    environmental actions actually took place?
                </p>
                <p>
                    Herena addresses this by creating a transparent, blockchain-based system where
                    sustainability tasks are published, completed by volunteers, and verified by the
                    community. Every step is recorded on the Hedera ledger, providing an immutable
                    audit trail of environmental impact.
                </p>
            </section>

            <section className="mt-4">
                <h2 className="text-2xl font-semibold mb-2">2. Task Model</h2>
                <p className="mb-4">
                    The platform team publishes sustainability tasks that contribute to measurable
                    environmental impact. Each task specifies:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                    <li>
                        <b>Action:</b> The specific sustainability action (e.g., plant 100 trees,
                        recycle 50kg of plastic)
                    </li>
                    <li>
                        <b>Proof requirements:</b> What evidence must be submitted (photos, GPS
                        coordinates, receipts)
                    </li>
                    <li>
                        <b>Reward:</b> The amount of RN tokens awarded upon verified completion
                    </li>
                    <li>
                        <b>Deadline:</b> The timeframe for task completion
                    </li>
                    <li>
                        <b>Capacity:</b> Maximum number of participants
                    </li>
                </ul>
                <p className="mt-4">
                    Volunteers register on the platform, join available tasks, complete the required
                    action, and submit proof of completion. This proof then enters the DAO
                    verification pipeline.
                </p>
            </section>

            <section className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">3. DAO Verification System</h2>
                <p className="mb-4">
                    Community members serve as voters in the Herena DAO. When a volunteer submits
                    proof of task completion, a proposal is created for the community to review and
                    vote on. The verification process ensures that:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                    <li>Actions are genuine and not fabricated</li>
                    <li>Proof meets the specified requirements</li>
                    <li>The environmental impact is real and measurable</li>
                </ul>
                <p className="mt-4">
                    To participate in voting, users must stake RN tokens. This staking requirement
                    aligns incentives by ensuring voters have a financial stake in making honest and
                    accurate verification decisions.
                </p>
            </section>

            <section className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">4. Quadratic Voting</h2>
                <p className="mb-4">
                    Herena uses quadratic voting to prevent large token holders from dominating
                    governance decisions. In this system, the cost of additional votes grows
                    quadratically:
                </p>

                <div className="mb-4">
                    <p className="mb-2">
                        For a voter spending <InlineMath math="c" /> credits, the voting power is:
                    </p>
                    <BlockMath math="v = \lfloor\sqrt{c}\rfloor" />
                </div>

                <div className="mb-4">
                    <p className="mb-2">
                        This means the cost of <InlineMath math="v" /> votes is:
                    </p>
                    <BlockMath math="c = v^2" />
                </div>

                <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">Examples</h3>
                    <ul className="space-y-2 ml-4">
                        <li>1 vote costs 1 credit</li>
                        <li>2 votes cost 4 credits</li>
                        <li>3 votes cost 9 credits</li>
                        <li>10 votes cost 100 credits</li>
                    </ul>
                </div>

                <p>
                    This mechanism ensures that while everyone can participate, no single entity can
                    dominate the outcome without disproportionate cost. It encourages broad
                    participation and honest evaluation.
                </p>
            </section>

            <section className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">5. RN Tokenomics</h2>

                <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">Token Utility</h3>
                    <ul className="space-y-2 ml-4">
                        <li>
                            <InlineMath math="\text{RN}" /> is the native utility token of the
                            Herena platform
                        </li>
                        <li>Used as rewards for verified sustainability task completions</li>
                        <li>Required for staking to participate in DAO governance</li>
                        <li>Spent as credits in the quadratic voting system</li>
                    </ul>
                </div>

                <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">Staking Mechanics</h3>
                    <p className="mb-2">
                        Users stake RN tokens to gain voting power. The relationship between staked
                        amount and maximum voting credits per proposal is:
                    </p>
                    <BlockMath math="\text{maxCredits}(s) = \alpha \cdot s" />
                    <p>
                        where <InlineMath math="s" /> is the staked amount and{" "}
                        <InlineMath math="\alpha" /> is a platform parameter (initially set to 1).
                    </p>
                </div>

                <div className="mb-4">
                    <h3 className="text-xl font-medium mb-2">Staking Rewards</h3>
                    <p>
                        Stakers earn additional RN tokens as rewards for participating in
                        governance. The APY is determined by the total staked amount and platform
                        parameters, incentivizing long-term participation in the verification
                        ecosystem.
                    </p>
                </div>
            </section>

            <section className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">6. RN / HBAR Swap</h2>
                <p className="mb-4">
                    The platform includes a built-in swap mechanism allowing users to exchange
                    between RN tokens and HBAR. This facilitates onboarding by enabling users to:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                    <li>Acquire RN tokens using HBAR to participate in staking and voting</li>
                    <li>Convert earned RN rewards back to HBAR</li>
                    <li>Provide liquidity to the RN/HBAR pool</li>
                </ul>

                <div className="mt-4 mb-4">
                    <h3 className="text-xl font-medium mb-2">Swap Pricing</h3>
                    <p className="mb-2">The swap uses a constant product formula:</p>
                    <BlockMath math="x \cdot y = k" />
                    <p>
                        where <InlineMath math="x" /> is the HBAR reserve, <InlineMath math="y" />{" "}
                        is the RN reserve, and <InlineMath math="k" /> is the constant product. A
                        small fee (initially 0.3%) is charged on each swap to incentivize liquidity
                        providers.
                    </p>
                </div>
            </section>

            <section className="mt-8">
                <h2 className="text-2xl font-semibold mb-4">7. Hedera Integration</h2>
                <p className="mb-4">
                    Herena is built on the Hedera network for its unique combination of:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                    <li>
                        <b>Speed:</b> Near-instant transaction finality for seamless user experience
                    </li>
                    <li>
                        <b>Low cost:</b> Predictable, low transaction fees enabling
                        micro-transactions
                    </li>
                    <li>
                        <b>Carbon negative:</b> Hedera&apos;s proof-of-stake consensus is energy
                        efficient, aligning with sustainability goals
                    </li>
                    <li>
                        <b>Transparency:</b> Immutable public ledger for auditable environmental
                        impact records
                    </li>
                </ul>
                <p className="mt-4">
                    All task completions, votes, and token transfers are recorded on the Hedera
                    ledger, providing a transparent and verifiable record of the platform&apos;s
                    environmental impact.
                </p>
            </section>

            <section className="mt-8 mb-12">
                <h2 className="text-2xl font-semibold mb-4">Core Formulas (Summary)</h2>
                <div className="space-y-4">
                    <BlockMath math="\text{Voting Power: } v = \lfloor\sqrt{c}\rfloor \quad \text{where } c = \text{credits spent}" />
                    <BlockMath math="\text{Vote Cost: } c = v^2 \quad \text{(quadratic cost)}" />
                    <BlockMath math="\text{Max Credits: } \text{maxCredits}(s) = \alpha \cdot s \quad \text{where } s = \text{staked RN}" />
                    <BlockMath math="\text{Swap: } x \cdot y = k \quad \text{(constant product AMM)}" />
                </div>
            </section>
        </div>
    );
}
