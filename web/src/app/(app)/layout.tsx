import { IBM_Plex_Mono } from "next/font/google";

import Navbar from "@/components/Navbar";

const ibmPlexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-ibm-plex-mono",
});

export default function AppLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className={"w-full flex flex-col items-center " + ibmPlexMono.variable}>
            <div className="flex flex-col gap-6 container px-6">
                <Navbar
                    links={[
                        { label: "Tasks", href: "/" },
                        { label: "Governance", href: "/governance" },
                        { label: "Swap", href: "/swap" },
                    ]}
                />
                <div id="page">{children}</div>
            </div>
        </div>
    );
}
