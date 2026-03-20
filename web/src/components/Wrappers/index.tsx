import { Fragment } from "react";
import WalletProvider from "./Wallet";
import { ThemeProvider } from "./Theme";
import { Toaster } from "@/components/ui/sonner";

export default function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <WalletProvider>
                <Fragment key="app">{children}</Fragment>
                <Toaster key="toaster" expand richColors />
            </WalletProvider>
        </ThemeProvider>
    );
}
