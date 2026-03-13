import X from "../Logo/x";
import Logo from "../Logo";
import CurvedLoop from "../ui/CurvedLoop";

export default function Footer() {
    return (
        <footer className="w-full flex flex-col items-center justify-center">
            <div className="container py-12 px-6">
                <div className="w-full relative overflow-hidden bg-primary h-[400px] rounded-2xl p-6">
                    <div className="absolute w-[120%] -left-[5%] bottom-[315px] mt-12 pointer-none -rotate-24">
                        <CurvedLoop
                            marqueeText="Sustainability ✦ Verification ✦ Hedera ✦ "
                            speed={3}
                            curveAmount={500}
                            direction="left"
                            interactive={false}
                            className="text-primary"
                        />
                    </div>
                    <div className="flex items-between justify-between h-full">
                        <div className="flex items-center justify-center bg-background w-32 h-32 rounded-xl">
                            <Logo size={100} />
                        </div>
                        <div className="flex flex-col items-end justify-between h-full">
                            <a href="https://x.com/" target="_blank">
                                <X className="ml-4 text-background w-20 h-20" fill="#fff" />
                            </a>
                            <div className="flex items-center h-24 bg-background px-8 rounded-xl">
                                <h1 className="text-6xl font-black">VERIFIED SUSTAINABILITY</h1>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full flex justify-end text-second-foreground font-medium pr-4 pt-1">
                    <small>
                        Built on{" "}
                        <a href="https://hedera.com/" target="_blank" className="text-primary">
                            Hedera
                        </a>
                    </small>
                </div>
            </div>
        </footer>
    );
}
