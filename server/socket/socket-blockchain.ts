import type { Server } from "socket.io";
import { blockchainEvents } from "../lib/eventSync";

const EVENTS = [
    "task:created",
    "task:updated",
    "task:cancelled",
    "proof:submitted",
    "proposal:created",
    "proposal:voted",
    "proposal:resolved",
    "staking:staked",
    "staking:unstaked",
    "swap:executed",
];

export class SocketBlockchain {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
        this.listen();
    }

    private listen() {
        for (const event of EVENTS) {
            blockchainEvents.on(event, (data) => {
                this.io.emit(event, data);
            });
        }
    }
}
