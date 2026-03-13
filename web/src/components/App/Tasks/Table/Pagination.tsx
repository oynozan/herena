"use client";

import { Button } from "@/components/ui/button";

interface PaginationData {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
}

interface TaskPaginationProps {
    pagination: PaginationData;
    onPageChange: (page: number) => void;
}

export function TaskPagination({ pagination, onPageChange }: TaskPaginationProps) {
    if (pagination.totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
                Showing {(pagination.currentPage - 1) * pagination.perPage + 1} to{" "}
                {Math.min(pagination.currentPage * pagination.perPage, pagination.totalItems)} of{" "}
                {pagination.totalItems} tasks
            </div>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    disabled={pagination.currentPage === 1}
                    onClick={() => onPageChange(pagination.currentPage - 1)}
                >
                    Previous
                </Button>

                <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(page => {
                            return (
                                page === 1 ||
                                page === pagination.totalPages ||
                                Math.abs(page - pagination.currentPage) <= 1
                            );
                        })
                        .map((page, index, array) => {
                            const showEllipsis = index > 0 && page - array[index - 1] > 1;

                            return (
                                <div key={page} className="flex items-center gap-1">
                                    {showEllipsis && (
                                        <span className="px-2 text-muted-foreground">...</span>
                                    )}
                                    <Button
                                        variant={
                                            page === pagination.currentPage ? "default" : "outline"
                                        }
                                        onClick={() => onPageChange(page)}
                                    >
                                        {page}
                                    </Button>
                                </div>
                            );
                        })}
                </div>

                <Button
                    variant="outline"
                    disabled={pagination.currentPage === pagination.totalPages}
                    onClick={() => onPageChange(pagination.currentPage + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
