import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("Treasury", async function () {
    const { viem } = await network.connect();

    async function deployTreasury() {
        const [owner, taskManager, other] = await viem.getWalletClients();
        const initialMint = parseEther("1000");

        const treasury = await viem.deployContract("Treasury");

        const token = await viem.deployContract("Herena", [
            treasury.address,
            initialMint,
        ]);

        await treasury.write.setToken([token.address], {
            account: owner.account,
        });

        await treasury.write.setTaskManager([taskManager.account.address], {
            account: owner.account,
        });

        return { owner, taskManager, other, token, treasury, initialMint };
    }

    it("fundTask transfers tokens to taskManager", async function () {
        const { taskManager, token, treasury, initialMint } = await deployTreasury();

        const amount = parseEther("100");
        await treasury.write.fundTask([amount], { account: taskManager.account });

        const treasuryBalance = await token.read.balanceOf([treasury.address]);
        const taskManagerBalance = await token.read.balanceOf([
            taskManager.account.address,
        ]);

        assert.equal(treasuryBalance, initialMint - amount);
        assert.equal(taskManagerBalance, amount);
    });

    it("enforces taskManager-only and per-task cap", async function () {
        const { owner, taskManager, other, treasury } = await deployTreasury();

        await viem.assertions.revertWithCustomError(
            treasury.write.fundTask([10n], { account: other.account }),
            treasury,
            "NotTaskManager",
        );

        await treasury.write.setMaxTaskReward([5n], { account: owner.account });

        await viem.assertions.revertWithCustomError(
            treasury.write.fundTask([6n], { account: taskManager.account }),
            treasury,
            "AmountExceedsCap",
        );
    });

    it("owner can withdraw tokens", async function () {
        const { owner, other, token, treasury, initialMint } = await deployTreasury();

        const amount = 200n;
        await treasury.write.withdraw([other.account.address, amount], {
            account: owner.account,
        });

        const treasuryBalance = await token.read.balanceOf([treasury.address]);
        const recipientBalance = await token.read.balanceOf([
            other.account.address,
        ]);

        assert.equal(treasuryBalance, initialMint - amount);
        assert.equal(recipientBalance, amount);
    });
});
