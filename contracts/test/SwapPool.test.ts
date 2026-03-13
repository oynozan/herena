import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("SwapPool", async function () {
  const { viem } = await network.connect();

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

    await treasury.write.withdraw([owner.account.address, parseEther("10000")], {
      account: owner.account,
    });

    const pool = await viem.deployContract("SwapPool", [token.address]);

    return { owner, token, pool, treasury };
  }

  it("should add liquidity, mint LP, and allow proportional removal", async function () {
    const { owner, token, pool } = await deployCore();

    const tokenAmount = parseEther("1000");
    const hbarAmount = parseEther("10");

    await token.write.approve([pool.address, tokenAmount], {
      account: owner.account,
    });

    await pool.write.addLiquidity([tokenAmount], {
      account: owner.account,
      value: hbarAmount,
    });

    const lpTokenAddress = (await pool.read.lpToken()) as `0x${string}`;
    const lpToken = await viem.getContractAt("LPToken", lpTokenAddress);

    const lpBalance = (await lpToken.read.balanceOf([
      owner.account.address,
    ])) as bigint;
    assert(lpBalance > 0n);

    const reserveToken = await pool.read.reserveToken();
    const reserveHBAR = await pool.read.reserveHBAR();

    assert.equal(reserveToken, tokenAmount);
    assert.equal(reserveHBAR, hbarAmount);

    // remove half of liquidity
    const removeAmount = lpBalance / 2n;
    const tokenBefore = await token.read.balanceOf([owner.account.address]);
    const pc = await viem.getPublicClient();
    const hbarBefore = await pc.getBalance({ address: owner.account.address });

    await lpToken.write.approve([pool.address, removeAmount], {
      account: owner.account,
    });
    await pool.write.removeLiquidity([removeAmount], {
      account: owner.account,
    });

    const tokenAfter = await token.read.balanceOf([owner.account.address]);
    const hbarAfter = await pc.getBalance({ address: owner.account.address });

    assert(tokenAfter > tokenBefore);
    assert(hbarAfter > hbarBefore);
  });

  it("should swap HBAR for token and respect minAmountOut", async function () {
    const { owner, token, pool } = await deployCore();
    const [, trader] = await viem.getWalletClients();

    const tokenAmount = parseEther("1000");
    const hbarAmount = parseEther("10");

    await token.write.approve([pool.address, tokenAmount], {
      account: owner.account,
    });
    await pool.write.addLiquidity([tokenAmount], {
      account: owner.account,
      value: hbarAmount,
    });

    const traderTokenBefore = await token.read.balanceOf([
      trader.account.address,
    ]);

    const hbarIn = parseEther("1");

    await pool.write.swapHBARForToken([0n], {
      account: trader.account,
      value: hbarIn,
    });

    const traderTokenAfter = await token.read.balanceOf([
      trader.account.address,
    ]);

    assert(traderTokenAfter > traderTokenBefore);
  });

  it("should swap token for HBAR and respect minAmountOut", async function () {
    const { owner, token, pool, treasury } = await deployCore();
    const [, trader] = await viem.getWalletClients();

    const tokenAmount = parseEther("1000");
    const hbarAmount = parseEther("10");

    await token.write.approve([pool.address, tokenAmount], {
      account: owner.account,
    });
    await pool.write.addLiquidity([tokenAmount], {
      account: owner.account,
      value: hbarAmount,
    });

    const traderTokenAmount = parseEther("10");

    await treasury.write.withdraw([trader.account.address, traderTokenAmount], {
      account: owner.account,
    });

    await token.write.approve([pool.address, traderTokenAmount], {
      account: trader.account,
    });

    const pc = await viem.getPublicClient();
    const hbarBefore = await pc.getBalance({ address: trader.account.address });

    await pool.write.swapTokenForHBAR([traderTokenAmount, 0n], {
      account: trader.account,
    });

    const hbarAfter = await pc.getBalance({ address: trader.account.address });

    assert(hbarAfter > hbarBefore);
  });
});

