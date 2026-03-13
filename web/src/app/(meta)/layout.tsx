export default function MetaLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="w-full flex flex-col items-center">
            <div className="flex flex-col gap-6 container px-6">
                <div id="page">{children}</div>
            </div>
        </div>
    );
}
