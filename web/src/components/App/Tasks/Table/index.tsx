"use client";

import { useState, useMemo } from "react";

import { TaskList } from "./List";
import { TaskFilters } from "./Filters";
import { TaskPagination } from "./Pagination";
import { mockTasks } from "@/lib/mock-data";
import type { Task } from "@/lib/types";

const PER_PAGE = 10;

export default function TasksTable() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        search: "",
        category: "",
        minReward: "",
        maxReward: "",
    });

    const filtered = useMemo(() => {
        let tasks: Task[] = mockTasks.filter(t => t.status === "active");

        if (filters.search) {
            const q = filters.search.toLowerCase();
            tasks = tasks.filter(
                t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
            );
        }

        if (filters.category) {
            tasks = tasks.filter(t => t.category === filters.category);
        }

        if (filters.minReward) {
            const min = Number(filters.minReward);
            if (!isNaN(min)) tasks = tasks.filter(t => t.reward >= min);
        }

        if (filters.maxReward) {
            const max = Number(filters.maxReward);
            if (!isNaN(max)) tasks = tasks.filter(t => t.reward <= max);
        }

        return tasks;
    }, [filters]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    const handleFiltersApply = (f: typeof filters) => {
        setFilters(f);
        setPage(1);
    };

    return (
        <div className="w-full flex flex-col gap-4">
            <TaskFilters onApply={handleFiltersApply} />

            <div className="w-full pb-4 border border-border rounded-xl flex flex-col gap-6">
                {filtered.length === 0 ? (
                    <p className="text-second-foreground text-center text-sm py-4">
                        There aren&apos;t any tasks matching your criteria.
                    </p>
                ) : (
                    <>
                        <TaskList tasks={paginated} />
                        <TaskPagination
                            pagination={{
                                currentPage,
                                totalPages,
                                totalItems: filtered.length,
                                perPage: PER_PAGE,
                            }}
                            onPageChange={setPage}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
