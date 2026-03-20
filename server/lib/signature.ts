import { ethers } from "ethers";

/**
 * Verifies a personal_sign signature and returns the recovered address (lowercase).
 * Returns null if verification fails.
 */
export function verifyJoinSignature(message: string, signature: string): string | null {
    try {
        const recovered = ethers.verifyMessage(message, signature);
        return recovered?.toLowerCase() ?? null;
    } catch {
        return null;
    }
}
