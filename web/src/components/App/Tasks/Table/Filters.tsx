"use client";

import { useState } from "react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FiltersState {
    search: string;
    category: string;
    minReward: string;
    maxReward: string;
}

interface TaskFiltersProps {
    onApply: (filters: FiltersState) => void;
}

export function TaskFilters({ onApply }: TaskFiltersProps) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [minReward, setMinReward] = useState("");
    const [maxReward, setMaxReward] = useState("");

    const applyFilters = () => {
        onApply({ search, category, minReward, maxReward });
    };

    const clearFilters = () => {
        setSearch("");
        setCategory("");
        setMinReward("");
        setMaxReward("");
        onApply({ search: "", category: "", minReward: "", maxReward: "" });
    };

    return (
        <div className="flex flex-col gap-3 p-4 border border-border rounded-full -mb-2">
            <div className="flex justify-between items-center gap-3">
                <Input
                    className="flex-1 w-full"
                    placeholder="Search tasks..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && applyFilters()}
                />

                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-50">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="trees">Trees</SelectItem>
                        <SelectItem value="carbon">Carbon</SelectItem>
                        <SelectItem value="recycling">Recycling</SelectItem>
                        <SelectItem value="water">Water</SelectItem>
                        <SelectItem value="energy">Energy</SelectItem>
                    </SelectContent>
                </Select>

                <Input
                    type="number"
                    className="w-50"
                    placeholder="Min reward (HRN)"
                    value={minReward}
                    onChange={e => setMinReward(e.target.value)}
                    min="0"
                />

                <Input
                    type="number"
                    className="w-50"
                    placeholder="Max reward (HRN)"
                    value={maxReward}
                    onChange={e => setMaxReward(e.target.value)}
                    min="0"
                />

                <div className="flex gap-2">
                    <Button onClick={applyFilters}>Apply</Button>
                    <Button variant="outline" onClick={clearFilters}>
                        Clear
                    </Button>
                </div>
            </div>
        </div>
    );
}
