import Navbar from "@/components/Navbar";

export default function UserLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="w-full flex flex-col items-center">
            <div className="flex flex-col gap-6 container px-6">
                <div>
                    <div className="flex flex-col">
                        <span className="text-second-foreground">Welcome back,</span>
                        <h1 className="text-2xl">Your Sustainability Dashboard</h1>
                    </div>
                </div>
                <Navbar
                    links={[
                        { label: "My Proofs", href: "/my-proofs" },
                        { label: "Staking", href: "/staking" },
                        { label: "My Votes", href: "/votes" },
                        { label: "Badges", href: "/badges" },
                    ]}
                />
                <div id="page">{children}</div>
            </div>
        </div>
    );
}
