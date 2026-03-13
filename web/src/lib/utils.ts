import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function relativeTime(timestamp: number): string {
    const now = new Date();
    const secondsPast = (now.getTime() - timestamp) / 1000;

    if (secondsPast < 60) return "Now";
    if (secondsPast < 3600) return `${Math.floor(secondsPast / 60)}m ago`;
    if (secondsPast < 86400) return `${Math.floor(secondsPast / 3600)}h ago`;
    if (secondsPast < 2592000) return `${Math.floor(secondsPast / 86400)}d ago`;
    if (secondsPast < 31536000) return `${Math.floor(secondsPast / 2592000)}mo ago`;
    return `${Math.floor(secondsPast / 31536000)}y ago`;
}

export function truncateAddress(address: string, prefixLength = 12, suffixLength = 6) {
    if (typeof address !== "string" || address.length < prefixLength + suffixLength) return address;

    const prefix = address.substring(0, prefixLength - 4);
    const suffix = address.substring(address.length - suffixLength);
    return `${prefix}...${suffix}`;
}

export function formatRN(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
