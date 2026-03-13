import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
    plugins: [hardhatToolboxViemPlugin],
    solidity: {
        profiles: {
            default: {
                version: "0.8.20",
            },
            production: {
                version: "0.8.20",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        },
    },
    networks: {
        hedera_testnet: {
            type: "http",
            chainType: "l1",
            url: configVariable("HEDERA_TESTNET_RPC"),
            accounts: [configVariable("PRIVATE_KEY")],
            chainId: 296,
        },
        hardhatMainnet: {
            type: "edr-simulated",
            chainType: "l1",
        },
        hardhatOp: {
            type: "edr-simulated",
            chainType: "op",
        },
        sepolia: {
            type: "http",
            chainType: "l1",
            url: configVariable("SEPOLIA_RPC_URL"),
            accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
        },
    },
});
