"use client";

import { useState, useEffect, useCallback } from "react";

import { TaskList } from "./List";
import { TaskFilters } from "./Filters";
import Pagination from "@/components/Table/Pagination";
import { fetchTasks } from "@/lib/api";
import type { Task } from "@/lib/types";

const PER_PAGE = 10;

export default function TasksTable() {
    const [activePage, setActivePage] = useState(1);
    const [pastPage, setPastPage] = useState(1);
    const [activeTasks, setActiveTasks] = useState<Task[]>([]);
    const [pastTasks, setPastTasks] = useState<Task[]>([]);
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
            const [activeRes, allRes] = await Promise.all([
                fetchTasks({ ...filters, status: "active", limit: 100 }),
                fetchTasks({ ...filters, limit: 100 }),
            ]);
            setActiveTasks(activeRes.tasks);
            setPastTasks(allRes.tasks.filter(t => t.status !== "active"));
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const activeTotalPages = Math.max(1, Math.ceil(activeTasks.length / PER_PAGE));
    const activeCurrentPage = Math.min(activePage, activeTotalPages);
    const paginatedActive = activeTasks.slice(
        (activeCurrentPage - 1) * PER_PAGE,
        activeCurrentPage * PER_PAGE,
    );

    const pastTotalPages = Math.max(1, Math.ceil(pastTasks.length / PER_PAGE));
    const pastCurrentPage = Math.min(pastPage, pastTotalPages);
    const paginatedPast = pastTasks.slice(
        (pastCurrentPage - 1) * PER_PAGE,
        pastCurrentPage * PER_PAGE,
    );

    const handleFiltersApply = (f: typeof filters) => {
        setFilters(f);
        setActivePage(1);
        setPastPage(1);
    };

    if (loading) {
        return <p className="text-second-foreground text-center text-sm py-8">Loading tasks...</p>;
    }

    return (
        <div className="w-full flex flex-col gap-4">
            <TaskFilters onApply={handleFiltersApply} />

            <div className="w-full pb-4 border border-border rounded-xl flex flex-col gap-2">
                {/* Active Tasks */}
                <div className="flex items-center justify-between gap-2 bg-primary/5 border-border border-b py-3 px-4 rounded-t-xl">
                    <h2 className="text-xl">Active Tasks</h2>
                    <span className="text-sm text-foreground/70 font-medium">
                        ({activeTasks.length})
                    </span>
                </div>
                {activeTasks.length === 0 ? (
                    <p className="text-second-foreground text-center text-sm py-4">
                        No active tasks at the moment.
                    </p>
                ) : (
                    <>
                        <TaskList tasks={paginatedActive} />
                        <Pagination
                            currentPage={activeCurrentPage}
                            totalPages={activeTotalPages}
                            totalItems={activeTasks.length}
                            perPage={PER_PAGE}
                            label="tasks"
                            onPageChange={setActivePage}
                        />
                    </>
                )}

                {/* Past Tasks */}
                <div className="flex items-center justify-between gap-2 bg-primary/5 border-border border-b border-t py-3 px-4 !mt-2">
                    <h2 className="text-xl">Past Tasks</h2>
                    <span className="text-sm text-foreground/70 font-medium">
                        ({pastTasks.length})
                    </span>
                </div>
                {pastTasks.length === 0 ? (
                    <p className="text-second-foreground text-center text-sm py-4">
                        No past tasks.
                    </p>
                ) : (
                    <>
                        <TaskList tasks={paginatedPast} />
                        <Pagination
                            currentPage={pastCurrentPage}
                            totalPages={pastTotalPages}
                            totalItems={pastTasks.length}
                            perPage={PER_PAGE}
                            label="tasks"
                            onPageChange={setPastPage}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
