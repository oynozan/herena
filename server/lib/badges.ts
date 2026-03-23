import { getHederaClient } from "./events";
import { logToHCS } from "./hcs";
import Badge from "../models/Badge";

export const BADGE_DEFS: Record<number, { name: string; description: string }> = {
    1: { name: "First Submission", description: "Submitted first proof of impact" },
    2: { name: "First Approval", description: "First proof approved by the community" },
    3: { name: "First Stake", description: "Staked 10+ HRN to support governance" },
    4: { name: "First Vote", description: "Cast first governance vote" },
};

export async function awardBadge(wallet: string, badgeType: 1 | 2 | 3 | 4): Promise<boolean> {
    const user = wallet.toLowerCase();

    const existing = await Badge.findOne({ user, badgeType });
    if (existing) return false;

    await Badge.create({ user, badgeType });
    console.log(`Badge ${badgeType} ("${BADGE_DEFS[badgeType].name}") awarded to ${user}`);

    logToHCS({ type: "badge_awarded", user, badgeType, name: BADGE_DEFS[badgeType].name });

    attemptHTSMint(user, badgeType).catch(err => {
        console.warn(`HTS mint failed for badge ${badgeType} -> ${user}:`, err);
    });

    return true;
}

async function attemptHTSMint(wallet: string, badgeType: number): Promise<void> {
    const client = getHederaClient();
    const tokenIdStr = process.env.HTS_BADGE_TOKEN_ID;
    if (!client || !tokenIdStr) return;

    const { TokenMintTransaction, TokenId } = await import("@hiero-ledger/sdk");

    const metadata = JSON.stringify({ badgeType, ...BADGE_DEFS[badgeType] });
    const mintTx = new TokenMintTransaction()
        .setTokenId(TokenId.fromString(tokenIdStr))
        .addMetadata(Buffer.from(metadata));

    const response = await mintTx.execute(client);
    const transactionId = response.transactionId.toString();
    const receipt = await response.getReceipt(client);
    const serialNumber = receipt.serials[0]?.toNumber();

    if (serialNumber) {
        await Badge.findOneAndUpdate({ user: wallet, badgeType }, { serialNumber, transactionId });
        console.log(`HTS mint success: badge ${badgeType} serial #${serialNumber} tx ${transactionId}`);
    }
}
