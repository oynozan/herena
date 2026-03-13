import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, zeroAddress } from "viem";

describe("Herena", async function () {
    const { viem } = await network.connect();

    it("Constructor should set name/symbol and mint initial supply to treasury", async function () {
        const [owner] = await viem.getWalletClients();

        const initialMint = parseEther("1000");
        const treasury = await viem.deployContract("Treasury");

        const token = await viem.deployContract("Herena", [treasury.address, initialMint]);

        await treasury.write.setToken([token.address], {
            account: owner.account,
        });

        assert.equal(await token.read.name(), "Herena");
        assert.equal(await token.read.symbol(), "HRN");
        assert.equal(await token.read.totalSupply(), initialMint);
        assert.equal(await token.read.balanceOf([treasury.address]), initialMint);
        assert.equal((await token.read.owner()).toLowerCase(), owner.account.address.toLowerCase());
    });

    it("Constructor should revert on zero treasury", async function () {
        const initialMint = 1n;
        const dummy = await viem.getContractAt("Herena", zeroAddress);

        await viem.assertions.revertWithCustomError(
            viem.deployContract("Herena", [zeroAddress, initialMint]),
            dummy,
            "ZeroAddress",
        );
    });

    it("Constructor should revert on zero initial mint", async function () {
        const [, treasury] = await viem.getWalletClients();
        const dummy = await viem.getContractAt("Herena", zeroAddress);

        await viem.assertions.revertWithCustomError(
            viem.deployContract("Herena", [treasury.account.address, 0n]),
            dummy,
            "ZeroAmount",
        );
    });
});
