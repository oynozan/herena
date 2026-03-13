import type { Metadata } from "next";
import { Figtree, Manrope } from "next/font/google";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Wrapper from "@/components/Wrappers";

import "@/styles/main.scss";
import "@/styles/globals.css";

const figtree = Figtree({
    variable: "--font-figtree",
    subsets: ["latin"],
    display: "swap",
    weight: ["400", "500", "600", "700", "800", "900"],
});

const manrope = Manrope({
    variable: "--font-manrope",
    subsets: ["latin"],
    display: "swap",
    weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
    title: "Herena - Decentralized Sustainability Verification on Hedera",
    description:
        "Herena incentivizes and verifies real-world sustainability actions through a decentralized community built on the Hedera network.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${figtree.variable} ${manrope.variable} antialiased`}>
                <Wrapper>
                    <Header />
                    <main>{children}</main>
                    <Footer />
                </Wrapper>
            </body>
        </html>
    );
}
