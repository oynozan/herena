import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    sassOptions: {
        includePaths: [path.join(__dirname, "src/components")],
        prependData: `@use "@/styles/mixins" as *;`,
    },
    reactCompiler: true,
    compiler: {
        removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
    },
    devIndicators: {
        position: "bottom-right",
    },
    reactStrictMode: false,
};

export default nextConfig;
