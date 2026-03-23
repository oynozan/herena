import "dotenv/config";
import {
    Client,
    AccountId,
    PrivateKey,
    TopicCreateTransaction,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
} from "@hiero-ledger/sdk";

async function main() {
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;

    if (!operatorId || !operatorKey) {
        console.error("Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY in .env");
        process.exit(1);
    }

    const client = Client.forTestnet();
    const privKey = PrivateKey.fromStringDer(operatorKey);
    client.setOperator(AccountId.fromString(operatorId), privKey);

    // 1. Create HCS topic
    console.log("Creating HCS topic...");
    const topicTx = new TopicCreateTransaction()
        .setSubmitKey(client.operatorPublicKey!)
        .setTopicMemo("Herena Sustainability Audit Trail");

    const topicReceipt = await (await topicTx.execute(client)).getReceipt(client);
    const topicId = topicReceipt.topicId!.toString();
    console.log("HCS Topic created:", topicId);

    // 2. Create HTS NFT collection for badges
    console.log("\nCreating HTS badge NFT collection...");
    const tokenTx = new TokenCreateTransaction()
        .setTokenName("Herena Impact Badge")
        .setTokenSymbol("HBADGE")
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTreasuryAccountId(AccountId.fromString(operatorId))
        .setSupplyKey(privKey.publicKey)
        .setAdminKey(privKey.publicKey)
        .setTokenMemo("Herena sustainability impact badges");

    const tokenReceipt = await (await tokenTx.execute(client)).getReceipt(client);
    const tokenId = tokenReceipt.tokenId!.toString();
    console.log("HTS Badge Token created:", tokenId);

    console.log(`\n--- Add to your .env ---`);
    console.log(`HCS_TOPIC_ID=${topicId}`);
    console.log(`HTS_BADGE_TOKEN_ID=${tokenId}`);

    client.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
