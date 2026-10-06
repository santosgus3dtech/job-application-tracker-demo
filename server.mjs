import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAppServer } from "./server/app.mjs";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const databasePath = process.env.DEMO_DB || path.join(appDir, ".data", "applications.db");
const server = createAppServer({ databasePath, distDir: path.join(appDir, "dist") });

server.listen(port, "127.0.0.1", () => {
  console.log(`Job Application Tracker Demo: http://127.0.0.1:${port}`);
  console.log("Using synthetic portfolio data only.");
});
