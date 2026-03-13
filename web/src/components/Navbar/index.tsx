"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function Navbar({ links = [] }: { links?: { label: string; href: string }[] }) {
    const pathname = usePathname();

    return (
        <nav className="w-full h-16 border border-border rounded-full flex items-center p-2">
            {links.map((link, index) => {
                const isActive = pathname.endsWith(link.href);

                return (
                    <Button
                        asChild
                        className="h-full px-8 text-lg"
                        key={index}
                        variant={isActive ? "default" : "ghost"}
                    >
                        <Link href={link.href}>{link.label}</Link>
                    </Button>
                );
            })}
        </nav>
    );
}
