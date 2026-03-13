import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("TaskManager", async function () {
    const { viem } = await network.connect();
    const publicClient = await viem.getPublicClient();

    async function deployHerenaAndTaskManager() {
        const [owner] = await viem.getWalletClients();
        const initialMint = parseEther("1000000");

        const treasury = await viem.deployContract("Treasury");

        const token = await viem.deployContract("Herena", [treasury.address, initialMint]);

        await treasury.write.setToken([token.address], {
            account: owner.account,
        });

        const taskManager = await viem.deployContract("TaskManager", [
            token.address,
            treasury.address,
        ]);

        await treasury.write.setTaskManager([taskManager.address], {
            account: owner.account,
        });

        return { owner, token, treasury, taskManager, initialMint };
    }

    it("should create task and lock total reward from treasury", async function () {
        const { owner, token, treasury, taskManager, initialMint } = await deployHerenaAndTaskManager();

        const block = await publicClient.getBlock();
        const deadline = block!.timestamp + 3600n;

        const rewardPerCompletion = 10n;
        const maxCompletions = 5n;
        const totalReward = rewardPerCompletion * maxCompletions;

        await taskManager.write.createTask(
            ["Test task", rewardPerCompletion, maxCompletions, deadline, "ipfs://task"],
            { account: owner.account },
        );

        const task = await taskManager.read.getTask([0n]);

        assert.equal(task.id, 0n);
        assert.equal(task.description, "Test task");
        assert.equal(task.rewardPerCompletion, rewardPerCompletion);
        assert.equal(task.maxCompletions, maxCompletions);
        assert.equal(task.completedCount, 0n);
        assert.equal(task.deadline, deadline);
        assert.equal(task.active, true);
        assert.equal(task.metadataURI, "ipfs://task");

        const mgrBalance = await token.read.balanceOf([taskManager.address]);
        const treasuryBalance = await token.read.balanceOf([treasury.address]);

        assert.equal(mgrBalance, totalReward);
        assert.equal(treasuryBalance, initialMint - totalReward);

        const isActive = await taskManager.read.isTaskActive([0n]);
        assert.equal(isActive, true);
    });

    it("should only allow proofManager to increment completion and deactivate on maxCompletions", async function () {
        const { owner, token, taskManager } = await deployHerenaAndTaskManager();
        const [, proofManager] = await viem.getWalletClients();

        const block = await publicClient.getBlock();
        const deadline = block!.timestamp + 3600n;

        const rewardPerCompletion = 5n;
        const maxCompletions = 2n;
        const totalReward = rewardPerCompletion * maxCompletions;

        await taskManager.write.createTask(
            ["PM task", rewardPerCompletion, maxCompletions, deadline, "ipfs://pm"],
            { account: owner.account },
        );

        await taskManager.write.setProofManager([proofManager.account.address], {
            account: owner.account,
        });

        // non-proofManager should revert
        await viem.assertions.revertWithCustomError(
            taskManager.write.incrementCompletion([0n], { account: owner.account }),
            taskManager,
            "NotProofManager",
        );

        // proofManager can increment until maxCompletions
        await taskManager.write.incrementCompletion([0n], {
            account: proofManager.account,
        });
        await taskManager.write.incrementCompletion([0n], {
            account: proofManager.account,
        });

        const task = await taskManager.read.getTask([0n]);
        assert.equal(task.completedCount, maxCompletions);
        assert.equal(task.active, false);

        const isActive = await taskManager.read.isTaskActive([0n]);
        assert.equal(isActive, false);
    });

    it("should cancel task and refund remaining rewards", async function () {
        const { owner, token, treasury, taskManager, initialMint } = await deployHerenaAndTaskManager();
        const [, proofManager] = await viem.getWalletClients();

        const block = await publicClient.getBlock();
        const deadline = block!.timestamp + 3600n;

        const rewardPerCompletion = 10n;
        const maxCompletions = 3n;
        const totalReward = rewardPerCompletion * maxCompletions;

        await taskManager.write.createTask(
            ["Cancelable task", rewardPerCompletion, maxCompletions, deadline, "ipfs://cancel"],
            { account: owner.account },
        );

        await taskManager.write.setProofManager([proofManager.account.address], {
            account: owner.account,
        });

        // mark one completion
        await taskManager.write.incrementCompletion([0n], {
            account: proofManager.account,
        });

        const beforeCancelMgrBalance = await token.read.balanceOf([taskManager.address]);
        const beforeCancelTreasuryBalance = await token.read.balanceOf([treasury.address]);

        await taskManager.write.cancelTask([0n], { account: owner.account });

        const remainingCompletions = maxCompletions - 1n;
        const expectedRefund = remainingCompletions * rewardPerCompletion;

        const afterCancelMgrBalance = await token.read.balanceOf([taskManager.address]);
        const afterCancelTreasuryBalance = await token.read.balanceOf([treasury.address]);

        assert.equal(afterCancelMgrBalance, totalReward - expectedRefund);
        assert.equal(afterCancelTreasuryBalance, initialMint - totalReward + expectedRefund);

        const task = await taskManager.read.getTask([0n]);
        assert.equal(task.active, false);
    });
});
