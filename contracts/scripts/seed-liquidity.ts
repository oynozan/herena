import { network } from "hardhat";
import { parseEther, type Hash } from "viem";

/**
 * Withdraws HRN tokens from Treasury to the deployer, then seeds the SwapPool.
 *
 * Usage:
 *   npx hardhat run scripts/seed-liquidity.ts --network hedera_testnet
 *
 * Adjust amounts below as needed.
 */
const TOKEN_AMOUNT = parseEther("10000"); // 10 000 HRN for liquidity
const HBAR_AMOUNT = parseEther("100");    // 100 HBAR  →  rate ≈ 100 HRN/HBAR

const HERENA_ADDRESS = "0x347be399b322a27828a6ab7ca658696cd304f1c5" as const;
const SWAP_POOL_ADDRESS = "0xb6ee9aded473e5c354d81f6989175acf89c69668" as const;

async function main() {
    const { viem } = await network.connect("hedera_testnet");
    const publicClient = await viem.getPublicClient();
    const [deployer] = await viem.getWalletClients();

    console.log("Deployer:", deployer.account.address);

    const herena = await viem.getContractAt("Herena", HERENA_ADDRESS);
    const swapPool = await viem.getContractAt("SwapPool", SWAP_POOL_ADDRESS);
    const herenaDeployTx = await publicClient.getTransaction({
        hash: "0x51fd60114e04c665a5e30c11443f05310e3fc1a8db9b56df6e03d526dc8c9edc",
    });

    const inputHex = herenaDeployTx.input;
    const treasuryPadded = "0x" + inputHex.slice(-128, -64);
    const treasuryAddress = ("0x" + treasuryPadded.slice(-40)) as `0x${string}`;
    console.log("Treasury address:", treasuryAddress);

    const treasury = await viem.getContractAt("Treasury", treasuryAddress);

    // --- Step 1: Check balances ---
    const treasuryBalance = await herena.read.balanceOf([treasuryAddress]);
    const deployerBalance = await herena.read.balanceOf([deployer.account.address]);
    console.log("Treasury HRN balance:", treasuryBalance.toString());
    console.log("Deployer HRN balance:", deployerBalance.toString());

    // --- Step 2: Withdraw from Treasury if needed ---
    if (deployerBalance < TOKEN_AMOUNT) {
        const needed = TOKEN_AMOUNT - deployerBalance;
        console.log(`Withdrawing ${needed} HRN from Treasury...`);
        const withdrawTx: Hash = await treasury.write.withdraw(
            [deployer.account.address, needed],
            { account: deployer.account },
        );
        await publicClient.waitForTransactionReceipt({ hash: withdrawTx });
        console.log("Withdraw tx:", withdrawTx);

        const newBalance = await herena.read.balanceOf([deployer.account.address]);
        console.log("Deployer HRN balance after withdraw:", newBalance.toString());
    }

    // --- Step 3: Approve SwapPool ---
    console.log("Approving SwapPool to spend HRN...");
    const approveTx: Hash = await herena.write.approve(
        [SWAP_POOL_ADDRESS, TOKEN_AMOUNT],
        { account: deployer.account },
    );
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log("Approve tx:", approveTx);

    // --- Step 4: Add liquidity ---
    console.log(`Adding liquidity: ${TOKEN_AMOUNT} HRN + ${HBAR_AMOUNT} HBAR...`);
    const addLiqTx: Hash = await swapPool.write.addLiquidity(
        [TOKEN_AMOUNT],
        { account: deployer.account, value: HBAR_AMOUNT },
    );
    const receipt = await publicClient.waitForTransactionReceipt({ hash: addLiqTx });
    console.log("AddLiquidity tx:", addLiqTx);
    console.log("Status:", receipt.status);

    // --- Step 5: Verify ---
    const [newHBAR, newToken] = await Promise.all([
        swapPool.read.reserveHBAR(),
        swapPool.read.reserveToken(),
    ]);
    console.log("Pool reserves:", {
        hbar: newHBAR.toString(),
        token: newToken.toString(),
    });
    console.log("Rate:", Number(newToken) / Number(newHBAR), "HRN per HBAR");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
