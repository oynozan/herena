"use client";

import { useState, useMemo } from "react";

import UserTaskWrapper from "./TaskWrapper";
import Pagination from "@/components/Table/Pagination";
import { mockUserTasks } from "@/lib/mock-data";

const PER_PAGE = 5;

export default function UserTasksTable() {
    const [activePage, setActivePage] = useState(1);
    const [completedPage, setCompletedPage] = useState(1);

    const activeTasks = useMemo(
        () =>
            mockUserTasks.filter(
                t =>
                    t.status === "joined" ||
                    t.status === "proof_submitted" ||
                    t.status === "pending_verification",
            ),
        [],
    );
    const completedTasks = useMemo(
        () => mockUserTasks.filter(t => t.status === "approved" || t.status === "rejected"),
        [],
    );

    const activeTotalPages = Math.max(1, Math.ceil(activeTasks.length / PER_PAGE));
    const activeCurrentPage = Math.min(activePage, activeTotalPages);
    const paginatedActive = activeTasks.slice(
        (activeCurrentPage - 1) * PER_PAGE,
        activeCurrentPage * PER_PAGE,
    );

    const completedTotalPages = Math.max(1, Math.ceil(completedTasks.length / PER_PAGE));
    const completedCurrentPage = Math.min(completedPage, completedTotalPages);
    const paginatedCompleted = completedTasks.slice(
        (completedCurrentPage - 1) * PER_PAGE,
        completedCurrentPage * PER_PAGE,
    );

    return (
        <div className="w-full pb-4 border border-border rounded-xl flex flex-col gap-2">
            {mockUserTasks.length === 0 ? (
                <p className="px-4 text-second-foreground text-center text-sm pb-4 pt-8">
                    You haven&apos;t joined any tasks yet.
                </p>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-2 bg-primary/5 border-border border-b py-3 px-4 rounded-t-xl">
                        <h2 className="text-xl">Active</h2>
                        <span className="text-sm text-foreground/70 font-medium">
                            ({activeTasks.length})
                        </span>
                    </div>
                    {activeTasks.length === 0 ? (
                        <p className="text-second-foreground text-center text-sm py-4">
                            No active tasks
                        </p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2 mt-2 px-4">
                                {paginatedActive.map(item => (
                                    <UserTaskWrapper key={item.id} userTask={item} />
                                ))}
                            </div>
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

                    <div className="flex items-center justify-between gap-2 bg-primary/5 border-border border-b border-t py-3 px-4 text-xl !mt-2">
                        <h2 className="text-xl">Completed</h2>
                        <span className="text-sm text-foreground/70 font-medium">
                            ({completedTasks.length})
                        </span>
                    </div>
                    {completedTasks.length === 0 ? (
                        <p className="text-second-foreground text-center text-sm py-4">
                            No completed tasks yet
                        </p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2 mt-2 px-4">
                                {paginatedCompleted.map(item => (
                                    <UserTaskWrapper key={item.id} userTask={item} />
                                ))}
                            </div>
                            <Pagination
                                currentPage={completedCurrentPage}
                                totalPages={completedTotalPages}
                                totalItems={completedTasks.length}
                                perPage={PER_PAGE}
                                label="tasks"
                                onPageChange={setCompletedPage}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
}
