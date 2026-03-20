import { readFileSync } from "node:fs";
import { join } from "node:path";

import { artifacts, network } from "hardhat";
import { type Address, parseEther } from "viem";

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
  const description = "Plant a tree";
  const rewardPerCompletion = parseEther("100");
  const maxCompletions = 1n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60); // 1 week
  const metadataURI = "ipfs://QmExample";
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
