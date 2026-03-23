import { Client, AccountId, PrivateKey } from "@hiero-ledger/sdk";

let hederaClient: Client | null = null;

export function initHederaClient(): Client | null {
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;

    if (!operatorId || !operatorKey) {
        console.warn("HEDERA_OPERATOR_ID/KEY not set; HCS/HTS features disabled");
        return null;
    }

    hederaClient = Client.forTestnet();
    hederaClient.setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromStringDer(operatorKey),
    );

    console.log("Hiero SDK initialized for", operatorId);
    return hederaClient;
}

export function getHederaClient(): Client | null {
    return hederaClient;
}
