/**
 * Load `OpenClaw/.env` regardless of current working directory.
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const openClawRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(openClawRoot, ".env") });
