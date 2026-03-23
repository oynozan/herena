"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { ArrowDown, ChevronDown } from "lucide-react";
import { useWallets } from "@privy-io/react-auth";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchPoolInfo, triggerSync } from "@/lib/api";
import { executeSwap, getAccountBalance } from "@/lib/hedera";

type TokenKey = "HBAR" | "HRN";

interface TokenInfo {
    key: TokenKey;
    name: string;
    logo: string;
    balance: number;
    usd: number;
}

export default function SwapPage() {
    const { wallets } = useWallets();
    const [fromAmount, setFromAmount] = useState("");
    const [sellToken, setSellToken] = useState<TokenKey>("HBAR");
    const [buyToken, setBuyToken] = useState<TokenKey>("HRN");
    const [rate, setRate] = useState(0);
    const [tokenReserve, setTokenReserve] = useState(0);
    const [fee, setFee] = useState(0.3);
    const [loading, setLoading] = useState(true);
    const [swapping, setSwapping] = useState(false);
    const [hbarBalance, setHbarBalance] = useState(0);
    const [hrnBalance, setHrnBalance] = useState(0);

    const tokenList: TokenInfo[] = [
        { key: "HBAR", name: "HBAR", logo: "/hbar.svg", balance: hbarBalance, usd: 0.28 },
        { key: "HRN", name: "HRN", logo: "/logo.png", balance: hrnBalance, usd: 0.0112 },
    ];

    const wallet = wallets[0];

    const refreshBalances = useCallback(async () => {
        if (!wallet) return;
        try {
            const provider = await wallet.getEthereumProvider();
            const bal = await getAccountBalance(provider, wallet.address);
            setHbarBalance(bal.hbar);
            setHrnBalance(bal.hrn);
        } catch (err) {
            console.error("Failed to fetch balances:", err);
        }
    }, [wallet]);

    useEffect(() => {
        refreshBalances();
    }, [refreshBalances]);

    useEffect(() => {
        async function load() {
            try {
                const pool = await fetchPoolInfo();
                if (pool.rate > 0) setRate(pool.rate);
                if (pool.fee > 0) setFee(pool.fee);
                if (pool.tokenReserve > 0) setTokenReserve(pool.tokenReserve);
            } catch (err) {
                console.error("Failed to fetch pool info:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const tokenMap = Object.fromEntries(tokenList.map(t => [t.key, t])) as Record<TokenKey, TokenInfo>;

    const from = tokenMap[sellToken];
    const to = tokenMap[buyToken];

    const inputAmount = Number(fromAmount) || 0;

    // Use the AMM constant-product formula (matching the contract) instead of spot rate
    const feeRate = fee / 100; // 0.3% = 0.003
    let outputAmount = 0;
    if (rate > 0 && inputAmount > 0) {
        const hbarReserve = tokenReserve / rate; // derive from rate
        const amountInWithFee = inputAmount * (1 - feeRate);
        if (sellToken === "HBAR") {
            outputAmount = (amountInWithFee * tokenReserve) / (hbarReserve + amountInWithFee);
        } else {
            outputAmount = (amountInWithFee * hbarReserve) / (tokenReserve + amountInWithFee);
        }
    }
    const receivedAmount = outputAmount;

    const feeAmount = inputAmount > 0
        ? (sellToken === "HBAR" ? inputAmount * rate : inputAmount / rate) - receivedAmount
        : 0;
    const fromUsd = inputAmount * from.usd;
    const toUsd = receivedAmount * to.usd;

    const flipDirection = () => {
        setSellToken(buyToken);
        setBuyToken(sellToken);
        setFromAmount("");
    };

    const selectSellToken = (key: TokenKey) => {
        if (key === buyToken) {
            setBuyToken(sellToken);
        }
        setSellToken(key);
        setFromAmount("");
    };

    const selectBuyToken = (key: TokenKey) => {
        if (key === sellToken) {
            setSellToken(buyToken);
        }
        setBuyToken(key);
        setFromAmount("");
    };

    const handleSwap = async () => {
        if (!wallet) {
            toast.error("Please connect your wallet first");
            return;
        }
        setSwapping(true);
        try {
            const provider = await wallet.getEthereumProvider();
            await executeSwap(provider, {
                fromToken: sellToken,
                toToken: buyToken,
                amount: inputAmount,
                slippage: 1,
                expectedOutput: receivedAmount,
            });
            toast.success(
                `Swapped ${inputAmount} ${from.name} for ${receivedAmount.toFixed(4)} ${to.name}`,
            );
            setFromAmount("");
            await triggerSync(() => Promise.resolve(true));
            await refreshBalances();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("InsufficientLiquidity") || msg.includes("0xbb55fd27")) {
                toast.error("Not enough liquidity in the pool for this swap");
            } else if (msg.includes("ZeroAmount") || msg.includes("0x1f2a2005")) {
                toast.error("Amount must be greater than zero");
            } else if (msg.includes("SlippageTooHigh") || msg.includes("0x850c6f76")) {
                toast.error("Price moved too much — try increasing slippage tolerance");
            } else if (msg.includes("insufficient funds") || msg.includes("INSUFFICIENT_PAYER_BALANCE")) {
                toast.error("Insufficient HBAR balance for this swap");
            } else if (msg.includes("transfer failed")) {
                toast.error("Token transfer failed — check your HRN balance");
            } else if (msg.includes("user rejected") || msg.includes("User denied")) {
                toast.error("Transaction rejected");
            } else {
                toast.error("Swap failed — check your balance and try a smaller amount");
            }
        } finally {
            setSwapping(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full flex items-end justify-center mt-16">
                <div className="flex flex-col items-center">
                    <h2 className="text-5xl">
                        Swap <span className="text-primary">HRN</span> token{" "}
                        <span className="text-secondary">right now</span>
                    </h2>
                </div>
            </div>

            <div className="w-full flex gap-6 mt-8">
                <div className="flex-1 flex justify-center">
                    <div className="w-full max-w-[480px] flex flex-col gap-1 relative">
                        {/* Sell panel */}
                        <div className="border border-border bg-card dark:bg-[oklch(0.18_0_0)] rounded-2xl p-4 pb-6">
                            <p className="text-sm text-muted-foreground mb-2">Sell</p>
                            <div className="flex items-center justify-between gap-2">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0"
                                    value={fromAmount}
                                    onChange={e => {
                                        const v = e.target.value;
                                        if (/^[0-9]*\.?[0-9]*$/.test(v)) setFromAmount(v);
                                    }}
                                    className="bg-transparent text-4xl font-medium outline-none w-full min-w-0 placeholder:text-muted-foreground/40"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-2 bg-background dark:bg-[oklch(0.25_0_0)] hover:bg-accent dark:hover:bg-[oklch(0.3_0_0)] transition-colors rounded-full pl-2 pr-3 py-1.5 shrink-0 border border-border cursor-pointer">
                                            <Image
                                                src={from.logo}
                                                alt={from.name}
                                                width={28}
                                                height={28}
                                                className="rounded-full"
                                            />
                                            <span className="font-semibold text-lg">
                                                {from.name}
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                        {tokenList.map(token => (
                                            <DropdownMenuItem
                                                key={token.key}
                                                className="cursor-pointer flex items-center gap-2 py-2"
                                                onClick={() => selectSellToken(token.key)}
                                            >
                                                <Image
                                                    src={token.logo}
                                                    alt={token.name}
                                                    width={24}
                                                    height={24}
                                                    className="rounded-full"
                                                />
                                                <span className="font-medium">{token.name}</span>
                                                {token.key === sellToken && (
                                                    <span className="ml-auto text-primary text-xs">
                                                        Selected
                                                    </span>
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-muted-foreground">
                                    {inputAmount > 0 ? `$${fromUsd.toFixed(2)}` : ""}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {from.balance.toLocaleString()} {from.name}
                                </span>
                            </div>
                        </div>

                        {/* Swap direction button */}
                        <div className="flex items-center justify-center -mt-6 -mb-5 z-10">
                            <button
                                onClick={flipDirection}
                                className="bg-card dark:bg-[oklch(0.18_0_0)] border-4 border-background dark:border-[oklch(0.14_0_0)] rounded-xl p-2 hover:bg-accent dark:hover:bg-[oklch(0.22_0_0)] transition-colors cursor-pointer"
                            >
                                <ArrowDown className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Buy panel */}
                        <div className="border border-border bg-card dark:bg-[oklch(0.18_0_0)] rounded-2xl p-4 pt-6">
                            <p className="text-sm text-muted-foreground mb-2">Buy</p>
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className={`text-4xl font-medium min-w-0 ${
                                        receivedAmount > 0 ? "" : "text-muted-foreground/40"
                                    }`}
                                >
                                    {receivedAmount > 0 ? receivedAmount.toFixed(4) : "0"}
                                </span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-2 bg-background dark:bg-[oklch(0.25_0_0)] hover:bg-accent dark:hover:bg-[oklch(0.3_0_0)] transition-colors rounded-full pl-2 pr-3 py-1.5 shrink-0 border border-border cursor-pointer">
                                            <Image
                                                src={to.logo}
                                                alt={to.name}
                                                width={28}
                                                height={28}
                                                className="rounded-full"
                                            />
                                            <span className="font-semibold text-lg">{to.name}</span>
                                            <ChevronDown className="h-4 w-4 opacity-80" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                        {tokenList.map(token => (
                                            <DropdownMenuItem
                                                key={token.key}
                                                className="cursor-pointer flex items-center gap-2 py-2"
                                                onClick={() => selectBuyToken(token.key)}
                                            >
                                                <Image
                                                    src={token.logo}
                                                    alt={token.name}
                                                    width={24}
                                                    height={24}
                                                    className="rounded-full"
                                                />
                                                <span className="font-medium">{token.name}</span>
                                                {token.key === buyToken && (
                                                    <span className="ml-auto text-primary text-xs">
                                                        Selected
                                                    </span>
                                                )}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-muted-foreground">
                                    {receivedAmount > 0 ? `$${toUsd.toFixed(2)}` : ""}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {to.balance.toLocaleString()} {to.name}
                                </span>
                            </div>
                        </div>

                        {/* Action button */}
                        <Button
                            className="w-full h-14 text-lg font-semibold rounded-2xl mt-1"
                            disabled={inputAmount <= 0 || rate === 0 || swapping}
                            onClick={handleSwap}
                        >
                            {loading
                                ? "Loading..."
                                : swapping
                                  ? "Swapping..."
                                  : inputAmount <= 0
                                    ? "Get started"
                                    : `Swap ${from.name} for ${to.name}`}
                        </Button>

                        {/* Fee details */}
                        {inputAmount > 0 && rate > 0 && (
                            <div className="text-sm text-muted-foreground space-y-1 px-2 pt-2">
                                <div className="flex justify-between">
                                    <span>Rate</span>
                                    <span>1 HBAR = {rate.toFixed(2)} HRN</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Fee ({fee}%)</span>
                                    <span>
                                        {feeAmount.toFixed(4)} {to.name}
                                    </span>
                                </div>
                                <div className="flex justify-between font-medium text-foreground">
                                    <span>You receive</span>
                                    <span>
                                        {receivedAmount.toFixed(4)} {to.name}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
