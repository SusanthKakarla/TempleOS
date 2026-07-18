import { config } from "dotenv";

config({ path: ".env", quiet: true });
config({ path: ".env.local", quiet: true, override: true });
