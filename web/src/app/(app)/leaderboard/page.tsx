"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchLeaderboard, type LeaderboardResponse } from "@/lib/api";
import { truncateAddress } from "@/lib/utils";

export default function LeaderboardPage() {
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
                <h1 className="text-3xl font-bold">Leaderboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6 space-y-3">
                                {[...Array(5)].map((_, j) => (
                                    <div key={j} className="h-6 bg-muted rounded animate-pulse" />
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="container max-w-6xl mx-auto py-8 px-4">
                <h1 className="text-3xl font-bold">Leaderboard</h1>
                <p className="text-muted-foreground mt-4">Failed to load leaderboard.</p>
            </div>
        );
    }

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Leaderboard</h1>
                <p className="text-muted-foreground mt-1">
                    Top contributors to verified sustainability impact
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Volunteers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.volunteers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No data yet</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-muted-foreground">
                                        <th className="pb-3 font-medium">#</th>
                                        <th className="pb-3 font-medium">Address</th>
                                        <th className="pb-3 font-medium text-right">Tasks</th>
                                        <th className="pb-3 font-medium text-right">HRN Earned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.volunteers.map((v, i) => (
                                        <tr key={v.address} className="border-t border-border">
                                            <td className="py-3 font-semibold">{i + 1}</td>
                                            <td className="py-3 font-mono">
                                                {truncateAddress(v.address)}
                                            </td>
                                            <td className="py-3 text-right">{v.completedTasks}</td>
                                            <td className="py-3 text-right">
                                                {v.totalEarned.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Verifiers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.verifiers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No data yet</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-muted-foreground">
                                        <th className="pb-3 font-medium">#</th>
                                        <th className="pb-3 font-medium">Address</th>
                                        <th className="pb-3 font-medium text-right">Votes Cast</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.verifiers.map((v, i) => (
                                        <tr key={v.address} className="border-t border-border">
                                            <td className="py-3 font-semibold">{i + 1}</td>
                                            <td className="py-3 font-mono">
                                                {truncateAddress(v.address)}
                                            </td>
                                            <td className="py-3 text-right">{v.votesCast}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
