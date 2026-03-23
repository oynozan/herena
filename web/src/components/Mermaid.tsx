"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    themeVariables: {
        darkMode: true,
        background: "transparent",
        primaryColor: "#22c55e",
        primaryTextColor: "#e2e8f0",
        primaryBorderColor: "#22c55e",
        lineColor: "#64748b",
        secondaryColor: "#1e293b",
        tertiaryColor: "#0f172a",
        fontSize: "14px",
    },
});

let counter = 0;

export default function Mermaid({ chart }: { chart: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;
        const id = `mermaid-${counter++}`;
        ref.current.innerHTML = "";
        mermaid
            .render(id, chart)
            .then(({ svg }) => {
                if (ref.current) ref.current.innerHTML = svg;
            })
            .catch(console.error);
    }, [chart]);

    return <div ref={ref} className="flex justify-center my-4" />;
}
