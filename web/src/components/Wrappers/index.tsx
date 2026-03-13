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
                {children}
                <Toaster expand richColors />
            </WalletProvider>
        </ThemeProvider>
    );
}
