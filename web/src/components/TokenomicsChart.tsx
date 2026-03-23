"use client";

import { PieChart, Pie, Cell } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

const data = [
    { name: "Task Rewards (Volunteers)", value: 79.2, fill: "var(--color-task)" },
    { name: "Voter Rewards (Verifiers)", value: 19.8, fill: "var(--color-voter)" },
    { name: "AMM Liquidity", value: 1, fill: "var(--color-amm)" },
];

const config: ChartConfig = {
    task: { label: "Task Rewards (79.2%)", color: "#22c55e" },
    voter: { label: "Voter Rewards (19.8%)", color: "#3b82f6" },
    amm: { label: "AMM Liquidity (1%)", color: "#f59e0b" },
};

export default function TokenomicsChart() {
    return (
        <div className="flex flex-col items-center gap-4">
            <ChartContainer config={config} className="h-[300px] w-full max-w-[400px]">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                    >
                        {data.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                        ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: "#22c55e" }} />
                    <span>Task Rewards — 79.2%</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: "#3b82f6" }} />
                    <span>Voter Rewards — 19.8%</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: "#f59e0b" }} />
                    <span>AMM Liquidity — 1%</span>
                </div>
            </div>
        </div>
    );
}
