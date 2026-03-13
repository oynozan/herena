import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("Integration", function () {
  let viem: Awaited<ReturnType<typeof network.connect>>["viem"];
  let publicClient: Awaited<ReturnType<typeof viem.getPublicClient>>;

  before(async () => {
    ({ viem } = await network.connect());
    publicClient = await viem.getPublicClient();
  });

  async function deployCore() {
    const [owner] = await viem.getWalletClients();
    const initialMint = parseEther("1000000");

    const treasury = await viem.deployContract("Treasury");

    const token = await viem.deployContract("Herena", [
      treasury.address,
      initialMint,
    ]);

    await treasury.write.setToken([token.address], {
      account: owner.account,
    });

    const stakingManager = await viem.deployContract("StakingManager", [
      token.address,
      1n,
    ]);

    const taskManager = await viem.deployContract("TaskManager", [
      token.address,
      treasury.address,
    ]);

    await treasury.write.setTaskManager([taskManager.address], {
      account: owner.account,
    });

    const proofManager = await viem.deployContract("ProofManager", [
      taskManager.address,
    ]);

    const votingManager = await viem.deployContract("VotingManager", [
      token.address,
      stakingManager.address,
      taskManager.address,
      proofManager.address,
      3600n,
    ]);

    await taskManager.write.setProofManager([proofManager.address], {
      account: owner.account,
    });
    await taskManager.write.setVotingManager(
      [votingManager.address, parseEther("1000000")],
      { account: owner.account },
    );
    await proofManager.write.setVotingManager([votingManager.address], {
      account: owner.account,
    });

    return {
      owner,
      token,
      treasury,
      stakingManager,
      taskManager,
      proofManager,
      votingManager,
    };
  }

  it("full flow: create task -> submit proof -> vote -> distribute rewards", async function () {
    const {
      owner,
      token,
      treasury,
      stakingManager,
      taskManager,
      proofManager,
      votingManager,
    } = await deployCore();

    const [, voter, submitter] = await viem.getWalletClients();

    // setup: fund voter & submitter
    await treasury.write.withdraw([voter.account.address, parseEther("100")], {
      account: owner.account,
    });
    await treasury.write.withdraw([submitter.account.address, parseEther("100")], {
      account: owner.account,
    });

    // voter stakes tokens
    await token.write.approve([stakingManager.address, 16n], {
      account: voter.account,
    });
    await stakingManager.write.stake([16n], { account: voter.account });

    // owner creates task and locks rewards
    const deadline = (await publicClient.getBlock())!.timestamp + 7200n;
    const rewardPerCompletion = parseEther("1");
    const maxCompletions = 1n;
    const totalReward = rewardPerCompletion * maxCompletions;

    await taskManager.write.createTask(
      [
        "Integration task",
        rewardPerCompletion,
        maxCompletions,
        deadline,
        "ipfs://integration",
      ],
      { account: owner.account },
    );

    // submitter submits proof
    const submitterBalanceBefore = await token.read.balanceOf([
      submitter.account.address,
    ]);
    const voterBalanceBefore = await token.read.balanceOf([
      voter.account.address,
    ]);

    await proofManager.write.submitProof([0n, "ipfs://proof-integration"], {
      account: submitter.account,
    });

    // there should be a proposal 0
    const proposal = await votingManager.read.getProposal([0n]);
    assert.equal(proposal.id, 0n);
    assert.equal(proposal.proofId, 0n);

    // voter approves
    await votingManager.write.vote([0n, true], { account: voter.account });

    const testClient = await viem.getTestClient();
    await testClient.increaseTime({ seconds: 4000 });
    await testClient.mine({ blocks: 1 });

    await votingManager.write.resolveProposal([0n], {
      account: owner.account,
    });

    const submitterBalanceAfter = await token.read.balanceOf([
      submitter.account.address,
    ]);
    const voterBalanceAfter = await token.read.balanceOf([
      voter.account.address,
    ]);

    assert(
      submitterBalanceAfter > submitterBalanceBefore,
      "submitter should receive reward",
    );
    assert(
      voterBalanceAfter > voterBalanceBefore,
      "voter should receive reward",
    );

    const task = await taskManager.read.getTask([0n]);
    assert.equal(task.completedCount, 1n);
    assert.equal(task.active, false);
  });
});
