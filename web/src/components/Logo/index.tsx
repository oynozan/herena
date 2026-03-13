import Image from "next/image";
import "./logo.scss";

export default function Logo({ size = 32 }: { size?: number }) {
    return (
        <div className="brand-logo">
            <Image src="/logo.png" alt="Herena" width={size} height={size} />
        </div>
    );
}
