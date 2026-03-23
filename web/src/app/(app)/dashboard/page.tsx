"use client";

import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { fetchStats, type StatsResponse } from "@/lib/api";

const categoryConfig: ChartConfig = {
    trees: { label: "Trees", color: "hsl(142, 71%, 45%)" },
    carbon: { label: "Carbon", color: "hsl(200, 80%, 50%)" },
    recycling: { label: "Recycling", color: "hsl(48, 96%, 53%)" },
    water: { label: "Water", color: "hsl(210, 79%, 46%)" },
    energy: { label: "Energy", color: "hsl(25, 95%, 53%)" },
    other: { label: "Other", color: "hsl(215, 16%, 47%)" },
};

const timelineConfig: ChartConfig = {
    count: { label: "Completions", color: "hsl(142, 71%, 45%)" },
};

export default function DashboardPage() {
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats()
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="container max-w-6xl mx-auto py-8 px-4 space-y-6">
                <h1 className="text-3xl font-bold">Impact Dashboard</h1>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="h-4 bg-muted rounded w-1/2 mb-2 animate-pulse" />
                                <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="container max-w-6xl mx-auto py-8 px-4">
                <h1 className="text-3xl font-bold">Impact Dashboard</h1>
                <p className="text-muted-foreground mt-4">Failed to load dashboard data.</p>
            </div>
        );
    }

    const categoryData = stats.categories.map(c => ({
        category: c.category,
        count: c.count,
        fill: `var(--color-${c.category})`,
    }));

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Impact Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Real-time sustainability metrics verified on Hedera
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Tasks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.totalTasks}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.activeTasks} active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Proofs Submitted
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.totalProofs}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.approvedProofs} approved
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Volunteers
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{stats.uniqueVolunteers}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.totalVotes} votes cast
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            HRN Distributed
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">
                            {stats.totalHRN.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            to verified contributors
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Tasks by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {categoryData.length > 0 ? (
                            <ChartContainer config={categoryConfig} className="h-[300px] w-full">
                                <BarChart data={categoryData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="category"
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                                    />
                                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        ) : (
                            <p className="text-sm text-muted-foreground">No data yet</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Completions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.timeline.length > 0 ? (
                            <ChartContainer config={timelineConfig} className="h-[300px] w-full">
                                <AreaChart data={stats.timeline}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="var(--color-count)"
                                        fill="var(--color-count)"
                                        fillOpacity={0.2}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        ) : (
                            <p className="text-sm text-muted-foreground">No data yet</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
