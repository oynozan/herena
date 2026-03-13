import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("VotingManager", async function () {
    const { viem } = await network.connect();

    async function deployCore() {
        const [owner] = await viem.getWalletClients();
        const initialMint = parseEther("1000000");

        const treasury = await viem.deployContract("Treasury");

        const token = await viem.deployContract("Herena", [treasury.address, initialMint]);

        await treasury.write.setToken([token.address], {
            account: owner.account,
        });

        const stakingManager = await viem.deployContract("StakingManager", [
            token.address,
            1n, // minStake
        ]);

        const taskManager = await viem.deployContract("TaskManager", [
            token.address,
            treasury.address,
        ]);

        const proofManager = await viem.deployContract("ProofManager", [taskManager.address]);

        const votingManager = await viem.deployContract("VotingManager", [
            token.address,
            stakingManager.address,
            taskManager.address,
            proofManager.address,
            3600n, // 1h voting duration
        ]);

        // wire contracts
        await taskManager.write.setProofManager([proofManager.address], {
            account: owner.account,
        });
        await taskManager.write.setVotingManager([votingManager.address, parseEther("1000000")], {
            account: owner.account,
        });
        await proofManager.write.setVotingManager([votingManager.address], {
            account: owner.account,
        });

        await treasury.write.setTaskManager([taskManager.address], {
            account: owner.account,
        });

        return { owner, token, treasury, stakingManager, taskManager, proofManager, votingManager };
    }

    it("should perform quadratic voting and distribute rewards on approval", async function () {
        const { owner, token, treasury, stakingManager, taskManager, proofManager, votingManager } =
            await deployCore();
        const [, voter1, voter2, submitter] = await viem.getWalletClients();

        // Create task with 1 reward unit
        const rewardPerCompletion = parseEther("1");
        const maxCompletions = 1n;
        const totalReward = rewardPerCompletion * maxCompletions;
        const deadline = (await (await viem.getPublicClient()).getBlock())!.timestamp + 7200n;

        await taskManager.write.createTask(
            ["Voting task", rewardPerCompletion, maxCompletions, deadline, "ipfs://voting"],
            { account: owner.account },
        );

        // Fund submitter & voters from Treasury
        await treasury.write.withdraw([submitter.account.address, parseEther("10")], {
            account: owner.account,
        });
        await treasury.write.withdraw([voter1.account.address, parseEther("10")], {
            account: owner.account,
        });
        await treasury.write.withdraw([voter2.account.address, parseEther("10")], {
            account: owner.account,
        });

        // Stake: voter1 has power 1 (stake 1), voter2 has power 4 (stake 16)
        await token.write.approve([stakingManager.address, parseEther("10")], {
            account: voter1.account,
        });
        await token.write.approve([stakingManager.address, parseEther("10")], {
            account: voter2.account,
        });

        await stakingManager.write.stake([1n], { account: voter1.account });
        await stakingManager.write.stake([16n], { account: voter2.account });

        // Submit proof
        await proofManager.write.submitProof([0n, "ipfs://proof"], {
            account: submitter.account,
        });

        // A proposal should have been created in VotingManager with id 0
        const proposal = await votingManager.read.getProposal([0n]);
        assert.equal(proposal.id, 0n);
        assert.equal(proposal.proofId, 0n);

        // Both voters approve
        await votingManager.write.vote([0n, true], { account: voter1.account });
        await votingManager.write.vote([0n, true], { account: voter2.account });

        // Fast-forward time by increasing block timestamp
        const testClient = await viem.getTestClient();
        await testClient.increaseTime({ seconds: 4000 });
        await testClient.mine({ blocks: 1 });

        const submitterBalanceBefore = await token.read.balanceOf([submitter.account.address]);
        const v1Before = await token.read.balanceOf([voter1.account.address]);
        const v2Before = await token.read.balanceOf([voter2.account.address]);

        await votingManager.write.resolveProposal([0n], {
            account: owner.account,
        });

        const submitterBalanceAfter = await token.read.balanceOf([submitter.account.address]);
        const v1After = await token.read.balanceOf([voter1.account.address]);
        const v2After = await token.read.balanceOf([voter2.account.address]);

        const submitterGain = submitterBalanceAfter - submitterBalanceBefore;
        const v1Gain = v1After - v1Before;
        const v2Gain = v2After - v2Before;

        // 80% of 1 HRN to submitter
        assert.equal(submitterGain, (rewardPerCompletion * 80n) / 100n);

        // 20% to voters proportionally to power: voter1=1, voter2=4 -> total=5
        const votersReward = rewardPerCompletion - submitterGain;
        const expectedV1 = (votersReward * 1n) / 5n;
        const expectedV2 = votersReward - expectedV1;

        assert.equal(v1Gain, expectedV1);
        assert.equal(v2Gain, expectedV2);
    });
});
