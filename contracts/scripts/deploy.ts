import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { network } from "hardhat";
import { parseEther } from "viem";

type DeploymentRecord = {
  Herena: string;
  StakingManager: string;
  TaskManager: string;
  ProofManager: string;
  VotingManager: string;
  SwapPool: string;
};

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  const initialMint = parseEther("1000000");

  // 1. Treasury
  const treasury = await viem.deployContract("Treasury");

  // 2. Herena token
  const herena = await viem.deployContract("Herena", [
    treasury.address,
    initialMint,
  ]);

  // 2.5 Set token address in treasury
  await treasury.write.setToken([herena.address], {
    account: deployer.account,
  });

  // 3. StakingManager
  const stakingManager = await viem.deployContract("StakingManager", [
    herena.address,
    parseEther("1"),
  ]);

  // 4. TaskManager
  const taskManager = await viem.deployContract("TaskManager", [
    herena.address,
    treasury.address,
  ]);

  // 4.5 Set taskManager in treasury
  await treasury.write.setTaskManager([taskManager.address], {
    account: deployer.account,
  });

  // 5. ProofManager
  const proofManager = await viem.deployContract("ProofManager", [
    taskManager.address,
  ]);

  // 6. VotingManager
  const votingDuration = 48n * 60n * 60n;
  const votingManager = await viem.deployContract("VotingManager", [
    herena.address,
    stakingManager.address,
    taskManager.address,
    proofManager.address,
    votingDuration,
  ]);

  // 7. SwapPool
  const swapPool = await viem.deployContract("SwapPool", [herena.address]);

  // 8. Wire ProofManager -> VotingManager
  await proofManager.write.setVotingManager([votingManager.address], {
    account: deployer.account,
  });

  // 9. Authorize ProofManager & VotingManager in TaskManager
  await taskManager.write.setProofManager([proofManager.address], {
    account: deployer.account,
  });
  await taskManager.write.setVotingManager(
    [votingManager.address, parseEther("1000000000")],
    { account: deployer.account },
  );

  // 10. Initial mint to treasury already done in Herena constructor

  const deploymentsPath = join(process.cwd(), "deployments.json");
  let existing: Record<string, DeploymentRecord> = {};
  if (existsSync(deploymentsPath)) {
    try {
      existing = JSON.parse(readFileSync(deploymentsPath, "utf8"));
    } catch {
      existing = {};
    }
  }

  const chainId = await publicClient.getChainId();
  existing[String(chainId)] = {
    Herena: herena.address,
    StakingManager: stakingManager.address,
    TaskManager: taskManager.address,
    ProofManager: proofManager.address,
    VotingManager: votingManager.address,
    SwapPool: swapPool.address,
  };

  writeFileSync(deploymentsPath, JSON.stringify(existing, null, 2));

  console.log("Deployed contracts:");
  console.log("Herena:", herena.address);
  console.log("StakingManager:", stakingManager.address);
  console.log("TaskManager:", taskManager.address);
  console.log("ProofManager:", proofManager.address);
  console.log("VotingManager:", votingManager.address);
  console.log("SwapPool:", swapPool.address);
  console.log("Deployments saved to", deploymentsPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

