import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("StakingManager", async function () {
    const { viem } = await network.connect();

    async function deployHerena() {
        const [owner] = await viem.getWalletClients();
        const initialMint = parseEther("1000000");

        const treasury = await viem.deployContract("Treasury");

        const token = await viem.deployContract("Herena", [treasury.address, initialMint]);

        await treasury.write.setToken([token.address], {
            account: owner.account,
        });

        return { owner, token, treasury };
    }

    it("should stake tokens and update balances and voting power (perfect squares)", async function () {
        const { owner, token, treasury } = await deployHerena();
        const [, staker] = await viem.getWalletClients();

        // transfer some HRN to staker
        await treasury.write.withdraw([staker.account.address, parseEther("10")], {
            account: owner.account,
        });

        const minStake = 0n;
        const stakingManager = await viem.deployContract("StakingManager", [
            token.address,
            minStake,
        ]);

        // approve and stake 1, 4, 9 HRN (in wei)
        const stakeAmounts = [1n, 4n, 9n];
        const totalStake = stakeAmounts.reduce((a, b) => a + b, 0n);

        await token.write.approve([stakingManager.address, totalStake], {
            account: staker.account,
        });

        for (const amount of stakeAmounts) {
            await stakingManager.write.stake([amount], { account: staker.account });
        }

        const staked = await stakingManager.read.getStakedAmount([staker.account.address]);
        assert.equal(staked, totalStake);

        const votingPower = await stakingManager.read.getVotingPower([staker.account.address]);
        // sqrt(1 + 4 + 9) = sqrt(14) -> floor(3)
        assert.equal(votingPower, 3n);

        const contractBalance = await token.read.balanceOf([stakingManager.address]);
        const stakerBalance = await token.read.balanceOf([staker.account.address]);

        assert.equal(contractBalance, totalStake);
        assert.equal(stakerBalance, parseEther("10") - totalStake);
    });

    it("should revert when stake keeps total below minStake", async function () {
        const { owner, token, treasury } = await deployHerena();
        const [, staker] = await viem.getWalletClients();

        await treasury.write.withdraw([staker.account.address, parseEther("1")], {
            account: owner.account,
        });

        const minStake = parseEther("1");
        const stakingManager = await viem.deployContract("StakingManager", [
            token.address,
            minStake,
        ]);

        await token.write.approve([stakingManager.address, parseEther("0.5")], {
            account: staker.account,
        });

        await viem.assertions.revertWithCustomError(
            stakingManager.write.stake([parseEther("0.5")], {
                account: staker.account,
            }),
            stakingManager,
            "BelowMinStake",
        );
    });

    it("should allow unstake when no active proposal and update balances", async function () {
        const { owner, token, treasury } = await deployHerena();
        const [, staker] = await viem.getWalletClients();

        await treasury.write.withdraw([staker.account.address, parseEther("5")], {
            account: owner.account,
        });

        const minStake = 1n;
        const stakingManager = await viem.deployContract("StakingManager", [
            token.address,
            minStake,
        ]);

        const stakeAmount = 4n;
        await token.write.approve([stakingManager.address, stakeAmount], {
            account: staker.account,
        });
        await stakingManager.write.stake([stakeAmount], {
            account: staker.account,
        });

        const beforeUnstakeBalance = await token.read.balanceOf([staker.account.address]);

        const unstakeAmount = 1n;
        await stakingManager.write.unstake([unstakeAmount], {
            account: staker.account,
        });

        const stakedAfter = await stakingManager.read.getStakedAmount([staker.account.address]);
        assert.equal(stakedAfter, stakeAmount - unstakeAmount);

        const afterUnstakeBalance = await token.read.balanceOf([staker.account.address]);
        assert.equal(afterUnstakeBalance, beforeUnstakeBalance + unstakeAmount);
    });
});
