"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Card, CardContent } from "@/components/ui/card";
import { fetchUserBadges, type BadgeInfo } from "@/lib/api";

const BADGE_DEFS = [
    {
        type: 1,
        name: "First Submission",
        description: "Submitted your first proof of impact",
        image: "/badges/1.png",
    },
    {
        type: 2,
        name: "First Approval",
        description: "Your first proof was approved by the community",
        image: "/badges/2.png",
    },
    {
        type: 3,
        name: "First Stake",
        description: "Staked 10+ HRN to support governance",
        image: "/badges/3.png",
    },
    {
        type: 4,
        name: "First Vote",
        description: "Cast your first governance vote",
        image: "/badges/4.png",
    },
];

export default function BadgesPage() {
    const { user } = usePrivy();
    const [earned, setEarned] = useState<BadgeInfo[]>([]);
    const [loading, setLoading] = useState(true);

    const wallet = user?.wallet?.address;

    useEffect(() => {
        if (!wallet) {
            setLoading(false);
            return;
        }
        fetchUserBadges(wallet)
            .then(data => setEarned(data.badges))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [wallet]);

    const earnedTypes = new Set(earned.map(b => b.badgeType));

    if (loading) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Impact Badges</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6 flex flex-col items-center gap-3">
                                <div className="h-24 w-24 bg-muted rounded-full animate-pulse" />
                                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!wallet) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Impact Badges</h2>
                <p className="text-muted-foreground">Connect your wallet to view badges.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-semibold">Impact Badges</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Earn badges by contributing to sustainability. Badges are minted as NFTs on Hedera.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {BADGE_DEFS.map(badge => {
                    const isEarned = earnedTypes.has(badge.type);
                    const badgeData = earned.find(b => b.badgeType === badge.type);

                    return (
                        <Card key={badge.type} className={!isEarned ? "opacity-70" : ""}>
                            <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                                <div className="relative">
                                    <img
                                        src={badge.image}
                                        alt={badge.name}
                                        className={`h-50 w-50 rounded-full object-cover ${
                                            !isEarned ? "grayscale" : ""
                                        }`}
                                    />
                                    {!isEarned && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="bg-background/80 text-xs font-semibold px-2 py-1 rounded">
                                                Locked
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-semibold">{badge.name}</h3>
                                <p className="text-xs text-muted-foreground">{badge.description}</p>
                                {isEarned && badgeData && (
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs font-medium text-primary">
                                            Earned {new Date(badgeData.earnedAt).toLocaleDateString()}
                                        </span>
                                        {badgeData.transactionId && (
                                            <a
                                                href={`https://hashscan.io/testnet/transaction/${badgeData.transactionId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-muted-foreground underline hover:text-primary transition-colors"
                                            >
                                                View on HashScan
                                            </a>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
