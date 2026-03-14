"use client";

import { toast } from "sonner";
import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchStakingInfo } from "@/lib/api";
import { stakeRN } from "@/lib/hedera";
import type { StakingInfo } from "@/lib/types";

export default function StakingPage() {
    const { user } = usePrivy();
    const { wallets } = useWallets();
    const [stakeAmount, setStakeAmount] = useState("");
    const [unstakeAmount, setUnstakeAmount] = useState("");
    const [staking, setStaking] = useState(false);
    const [unstaking, setUnstaking] = useState(false);
    const [info, setInfo] = useState<StakingInfo>({ stakedRN: 0, votingPower: 0, rewards: 0, apy: 0 });
    const [loading, setLoading] = useState(true);

    const loadInfo = async () => {
        const wallet = user?.wallet?.address;
        if (!wallet) {
            setLoading(false);
            return;
        }
        try {
            const data = await fetchStakingInfo(wallet);
            setInfo(data);
        } catch (err) {
            console.error("Failed to fetch staking info:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInfo();
    }, [user?.wallet?.address]);

    const handleStake = async () => {
        const wallet = wallets[0];
        if (!wallet) {
            toast.error("Please connect your wallet first");
            return;
        }
        const amount = Number(stakeAmount);
        if (!amount || amount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        setStaking(true);
        try {
            const provider = await wallet.getEthereumProvider();
            await stakeRN(provider, { amount, action: "stake" });
            toast.success(`Staked ${stakeAmount} RN`);
            setStakeAmount("");
            loadInfo();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to stake");
        } finally {
            setStaking(false);
        }
    };

    const handleUnstake = async () => {
        const wallet = wallets[0];
        if (!wallet) {
            toast.error("Please connect your wallet first");
            return;
        }
        const amount = Number(unstakeAmount);
        if (!amount || amount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        setUnstaking(true);
        try {
            const provider = await wallet.getEthereumProvider();
            await stakeRN(provider, { amount, action: "unstake" });
            toast.success(`Unstaked ${unstakeAmount} RN`);
            setUnstakeAmount("");
            loadInfo();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to unstake");
        } finally {
            setUnstaking(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full pl-2 flex items-end justify-between">
                <div className="flex flex-col">
                    <h2 className="text-xl">RN Staking</h2>
                    <p className="text-second-foreground text-sm">
                        Stake RN tokens to participate in governance and earn rewards.
                    </p>
                </div>
            </div>

            <div className="w-full grid grid-cols-4 gap-4">
                <Card>
                    <CardHeader>
                        <CardDescription>Total Staked</CardDescription>
                        <CardTitle className="text-2xl">
                            {loading ? "..." : `${info.stakedRN.toLocaleString()} RN`}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Voting Power</CardDescription>
                        <CardTitle className="text-2xl">
                            {loading ? "..." : info.votingPower}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Earned Rewards</CardDescription>
                        <CardTitle className="text-2xl">
                            {loading ? "..." : `${info.rewards} RN`}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Current APY</CardDescription>
                        <CardTitle className="text-2xl">
                            {loading ? "..." : `${info.apy}%`}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="w-full grid grid-cols-2 gap-4 mt-2">
                <div className="border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-1">Stake RN</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Staking RN tokens grants you voting power in the DAO. Voting power is
                        calculated using a quadratic formula to ensure fair governance.
                    </p>
                    <Input
                        placeholder="Amount to stake"
                        type="number"
                        value={stakeAmount}
                        onChange={e => setStakeAmount(e.target.value)}
                    />
                    <Button
                        className="mt-3 w-full"
                        onClick={handleStake}
                        disabled={staking}
                    >
                        {staking ? "Staking..." : "Stake"}
                    </Button>
                </div>
                <div className="border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-1">Unstake RN</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Unstaking reduces your voting power and may have a cooldown period. Pending
                        rewards will be claimed automatically.
                    </p>
                    <Input
                        placeholder="Amount to unstake"
                        type="number"
                        value={unstakeAmount}
                        onChange={e => setUnstakeAmount(e.target.value)}
                    />
                    <Button
                        className="mt-3 w-full"
                        variant="outline"
                        onClick={handleUnstake}
                        disabled={unstaking}
                    >
                        {unstaking ? "Unstaking..." : "Unstake"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
