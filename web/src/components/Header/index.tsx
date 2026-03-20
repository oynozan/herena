"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { usePrivy, useWallets } from "@privy-io/react-auth";

import Logo from "../Logo";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truncateAddress } from "@/lib/utils";
import { ExternalLink, Moon, Sun } from "lucide-react";

import "./header.scss";

export default function Header() {
    const { theme, setTheme } = useTheme();

    const { ready } = useWallets();
    const { login, user, logout } = usePrivy();

    return (
        <header>
            <div className="flex items-center h-6 w-full bg-primary text-white text-xs">
                <p className="w-full text-center font-manrope">
                    Herena is currently in beta. Built on Hedera for transparent sustainability
                    verification.
                </p>
            </div>
            <div className="container">
                <div>
                    <Link href="/">
                        <Logo size={38} />
                    </Link>
                </div>
                <div className="flex gap-5">
                    <Link href="/">Tasks</Link>
                    <Link href="/governance">Governance</Link>
                    <Link href="/swap">Swap</Link>
                    <Link href="/whitepaper">Whitepaper</Link>
                    <Link href="/my-tasks">My Impact</Link>
                </div>
                <div className="flex-1 flex justify-end items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    >
                        {theme === "dark" ? (
                            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 transition-all" />
                        ) : (
                            <Moon className="absolute h-[1.2rem] w-[1.2rem] -rotate-12 transition-all" />
                        )}
                    </Button>
                    {user?.wallet ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>{truncateAddress(user.wallet.address)}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom" className="w-50 mt-2">
                                <DropdownMenuLabel className="text-second-foreground">
                                    Account
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer font-medium">
                                    <Link href="/my-tasks">My Tasks</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="cursor-pointer font-medium">
                                    <Link href="/staking">Staking</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="cursor-pointer font-medium">
                                    <Link href="/votes">My Votes</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-second-foreground">
                                    Actions
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={logout}
                                    className="cursor-pointer font-medium text-destructive transition-[80ms] hover:!bg-destructive hover:!text-white"
                                >
                                    Disconnect
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <>
                            {ready && (
                                <Button onClick={login} className="text-xs h-8">
                                    Connect wallet
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
