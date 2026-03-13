import TaskWrapper from "./TaskWrapper";
import type { Task } from "@/lib/types";

interface TaskListProps {
    tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
    return (
        <div className="flex flex-col gap-2 py-4 px-4">
            {tasks.map(item => (
                <TaskWrapper key={item.id} task={item} />
            ))}
        </div>
    );
}
