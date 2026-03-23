import dotenv from "dotenv";
import { join } from "node:path";
import { readFileSync } from "node:fs";

import { artifacts, network } from "hardhat";
import { type Address, parseEther } from "viem";

dotenv.config();

async function main() {
  const deploymentsPath = join(process.cwd(), "deployments.json");
  const deployments = JSON.parse(readFileSync(deploymentsPath, "utf8"));

  const { viem } = await network.connect("hedera_testnet");
  const publicClient = await viem.getPublicClient();
  const [wallet] = await viem.getWalletClients();

  const chainId = await publicClient.getChainId();
  const entry = deployments[String(chainId)];
  if (!entry?.TaskManager) {
    throw new Error(`No TaskManager deployment found for chain ${chainId}`);
  }

  const taskManagerAddr: Address =
    typeof entry.TaskManager === "string"
      ? entry.TaskManager
      : entry.TaskManager.address;

  const taskManager = await viem.getContractAt("TaskManager", taskManagerAddr);

  // ── Task parameters ──────────────────────────────────────────────
  const description = "Water 10 trees in your community park";
  const rewardPerCompletion = parseEther("200");
  const maxCompletions = 100n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 5 * 60); // 5 minutes

  // Write task metadata as markdown here. It will be uploaded to IPFS.
  const TASK_METADATA = `
Water 10 trees in your community park.

**Requirements:**
- Plant at least 10 trees
- Take before/after photos of the planting site

**Accepted proof types:**
- Photos with timestamps
  `.trim();

  // Upload metadata to IPFS via the protected server route
  const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";
  const SERVER_TOKEN = process.env.SERVER_TOKEN;
  if (!SERVER_TOKEN) {
    throw new Error("SERVER_TOKEN env var required (ES256 JWT for protected routes)");
  }

  console.log("Uploading task metadata to IPFS...");
  const ipfsRes = await fetch(`${SERVER_URL}/protected/ipfs/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVER_TOKEN}`,
    },
    body: JSON.stringify({ content: TASK_METADATA }),
  });

  if (!ipfsRes.ok) {
    const err = await ipfsRes.text();
    throw new Error(`IPFS upload failed: ${ipfsRes.status} ${err}`);
  }

  const { uri: metadataURI } = (await ipfsRes.json()) as { uri: string };
  console.log("Metadata uploaded:", metadataURI);
  // ─────────────────────────────────────────────────────────────────

  console.log("Creating task on TaskManager:", taskManagerAddr);
  console.log("  description:", description);
  console.log("  rewardPerCompletion:", rewardPerCompletion.toString(), "wei");
  console.log("  maxCompletions:", maxCompletions.toString());
  console.log("  deadline:", new Date(Number(deadline) * 1000).toISOString());
  console.log("  metadataURI:", metadataURI);

  const hash = await taskManager.write.createTask(
    [description, rewardPerCompletion, maxCompletions, deadline, metadataURI],
    { account: wallet.account },
  );

  console.log("\nTransaction sent:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("Confirmed in block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log(
    `\nHashScan: https://hashscan.io/testnet/transaction/${hash}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
