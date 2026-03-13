"use client";

import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { mockStakingInfo } from "@/lib/mock-data";

export default function StakingPage() {
    const [stakeAmount, setStakeAmount] = useState("");
    const [unstakeAmount, setUnstakeAmount] = useState("");
    const info = mockStakingInfo;

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
                            {info.stakedRN.toLocaleString()} RN
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Voting Power</CardDescription>
                        <CardTitle className="text-2xl">{info.votingPower}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Earned Rewards</CardDescription>
                        <CardTitle className="text-2xl">{info.rewards} RN</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardDescription>Current APY</CardDescription>
                        <CardTitle className="text-2xl">{info.apy}%</CardTitle>
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
                        onClick={() => {
                            toast.success(`Staked ${stakeAmount} RN`);
                            setStakeAmount("");
                        }}
                    >
                        Stake
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
                        onClick={() => {
                            toast.success(`Unstaked ${unstakeAmount} RN`);
                            setUnstakeAmount("");
                        }}
                    >
                        Unstake
                    </Button>
                </div>
            </div>
        </div>
    );
}
