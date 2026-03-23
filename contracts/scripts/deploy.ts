import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { artifacts, network } from "hardhat";
import { type Address, type Hash, parseEther } from "viem";

type DeploymentEntry = {
  address: Address;
  deployTxHash: Hash;
};

type DeploymentRecord = {
  Herena: DeploymentEntry;
  StakingManager: DeploymentEntry;
  TaskManager: DeploymentEntry;
  ProofManager: DeploymentEntry;
  VotingManager: DeploymentEntry;
  SwapPool: DeploymentEntry;
  setupTxHashes: Hash[];
};

async function main() {
  const { viem } = await network.connect("hedera_testnet");
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  const txLog: Hash[] = [];

  async function deploy(contractName: string, args: unknown[] = []) {
    console.log(`[deploy] Deploying ${contractName}...`);
    try {
      const artifact = await artifacts.readArtifact(contractName);
      const hash = await deployer.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode as `0x${string}`,
        args,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const addr = receipt.contractAddress!;
      console.log(`[deploy] ${contractName} -> ${addr} (tx: ${hash})`);

      const contract = await viem.getContractAt(contractName, addr);
      return { contract, address: addr, hash };
    } catch (err) {
      console.error(`[deploy] FAILED deploying ${contractName}:`, err);
      throw err;
    }
  }

  async function logWrite(label: string, hashPromise: Promise<Hash>) {
    console.log(`[setup]  Running ${label}...`);
    try {
      const hash = await hashPromise;
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`[setup]  ${label} OK (tx: ${hash})`);
      txLog.push(hash);
      return hash;
    } catch (err) {
      console.error(`[setup]  FAILED ${label}:`, err);
      throw err;
    }
  }

  const initialMint = parseEther("1000000");

  // 1. Treasury
  const treasury = await deploy("Treasury");

  // 2. Herena token
  const herena = await deploy("Herena", [treasury.address, initialMint]);

  // 2.5 Set token address in treasury
  await logWrite(
    "Treasury.setToken",
    treasury.contract.write.setToken([herena.address], {
      account: deployer.account,
    }),
  );

  // 3. StakingManager
  const stakingManager = await deploy("StakingManager", [
    herena.address,
    parseEther("1"),
  ]);

  // 4. TaskManager
  const taskManager = await deploy("TaskManager", [
    herena.address,
    treasury.address,
  ]);

  // 4.5 Set taskManager in treasury
  await logWrite(
    "Treasury.setTaskManager",
    treasury.contract.write.setTaskManager([taskManager.address], {
      account: deployer.account,
    }),
  );

  // 5. ProofManager
  const proofManager = await deploy("ProofManager", [taskManager.address]);

  // 6. VotingManager
  const votingDuration = 48n * 60n * 60n;
  const votingManager = await deploy("VotingManager", [
    herena.address,
    stakingManager.address,
    taskManager.address,
    proofManager.address,
    votingDuration,
  ]);

  // 7. SwapPool
  const swapPool = await deploy("SwapPool", [herena.address]);

  // 8. Wire ProofManager -> VotingManager
  await logWrite(
    "ProofManager.setVotingManager",
    proofManager.contract.write.setVotingManager([votingManager.address], {
      account: deployer.account,
    }),
  );

  // 9. Authorize ProofManager & VotingManager in TaskManager
  await logWrite(
    "TaskManager.setProofManager",
    taskManager.contract.write.setProofManager([proofManager.address], {
      account: deployer.account,
    }),
  );
  await logWrite(
    "TaskManager.setVotingManager",
    taskManager.contract.write.setVotingManager(
      [votingManager.address, parseEther("1000000000")],
      { account: deployer.account },
    ),
  );

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
    Herena: { address: herena.address, deployTxHash: herena.hash },
    StakingManager: {
      address: stakingManager.address,
      deployTxHash: stakingManager.hash,
    },
    TaskManager: {
      address: taskManager.address,
      deployTxHash: taskManager.hash,
    },
    ProofManager: {
      address: proofManager.address,
      deployTxHash: proofManager.hash,
    },
    VotingManager: {
      address: votingManager.address,
      deployTxHash: votingManager.hash,
    },
    SwapPool: { address: swapPool.address, deployTxHash: swapPool.hash },
    setupTxHashes: txLog,
  };

  writeFileSync(deploymentsPath, JSON.stringify(existing, null, 2));

  console.log("\nDeployments saved to", deploymentsPath);
  console.log(
    "\nView on HashScan: https://hashscan.io/testnet/transaction/<TX_HASH>",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

