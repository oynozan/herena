"use client";

import { useState, useEffect, useCallback } from "react";

import { TaskList } from "./List";
import { TaskFilters } from "./Filters";
import { TaskPagination } from "./Pagination";
import { fetchTasks } from "@/lib/api";
import type { Task } from "@/lib/types";

const PER_PAGE = 10;

export default function TasksTable() {
    const [page, setPage] = useState(1);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        category: "",
        minReward: "",
        maxReward: "",
    });

    const loadTasks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchTasks({
                ...filters,
                status: "active",
                page,
                limit: PER_PAGE,
            });
            setTasks(res.tasks);
            setTotal(res.total);
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    const handleFiltersApply = (f: typeof filters) => {
        setFilters(f);
        setPage(1);
    };

    return (
        <div className="w-full flex flex-col gap-4">
            <TaskFilters onApply={handleFiltersApply} />

            <div className="w-full pb-4 border border-border rounded-xl flex flex-col gap-6">
                {loading ? (
                    <p className="text-second-foreground text-center text-sm py-8">Loading tasks...</p>
                ) : tasks.length === 0 ? (
                    <p className="text-second-foreground text-center text-sm py-4">
                        There aren&apos;t any tasks matching your criteria.
                    </p>
                ) : (
                    <>
                        <TaskList tasks={tasks} />
                        <TaskPagination
                            pagination={{
                                currentPage: page,
                                totalPages,
                                totalItems: total,
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
