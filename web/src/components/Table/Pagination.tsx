"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
    label?: string;
    onPageChange: (page: number) => void;
}

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    perPage,
    label = "items",
    onPageChange,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * perPage + 1} to{" "}
                {Math.min(currentPage * perPage, totalItems)} of {totalItems} {label}
            </div>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    Previous
                </Button>

                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                            return (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1
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
                                        variant={page === currentPage ? "default" : "outline"}
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
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
