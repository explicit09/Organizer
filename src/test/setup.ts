import "@testing-library/jest-dom";
import fs from "node:fs";

const workerId = process.env.VITEST_WORKER_ID ?? "0";
const testDbPath = `./test-${workerId}.db`;

process.env.DB_PATH = testDbPath;
fs.rmSync(testDbPath, { force: true });
