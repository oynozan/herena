import { TopicMessageSubmitTransaction, TopicId } from "@hiero-ledger/sdk";
import { getHederaClient } from "./events";

let topicId: TopicId | null = null;

export function initHCS() {
    const tid = process.env.HCS_TOPIC_ID;
    if (!tid) {
        console.warn("HCS_TOPIC_ID not set; HCS audit logging disabled");
        return;
    }
    topicId = TopicId.fromString(tid);
    console.log("HCS audit trail initialized with topic", tid);
}

export async function logToHCS(message: object): Promise<void> {
    const client = getHederaClient();
    if (!client || !topicId) return;

    try {
        const tx = new TopicMessageSubmitTransaction()
            .setTopicId(topicId)
            .setMessage(JSON.stringify(message));

        await tx.execute(client);
    } catch (err) {
        console.warn("HCS log failed (non-blocking):", err);
    }
}
