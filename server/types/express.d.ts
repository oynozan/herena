import type { IUser } from "../models/Users";

declare global {
    namespace Express {
        interface Request {
            user?: IUser | { wallet: string; id: string; email?: string };
        }
    }
}

export {};
