import { Skeleton } from "../ui/skeleton";

export default function TableLoading() {
    return (
        <div className="w-full flex flex-col space-y-3">
            {new Array(10).fill(0).map((_, index) => (
                <Skeleton key={index} className="h-[80px] w-full rounded-xl" />
            ))}
        </div>
    );
}
