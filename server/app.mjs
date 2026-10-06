import fs from "node:fs";
import http from "node:http";
import path from "node:path";

import { openDemoDatabase } from "./store.mjs";

const allowedFilters = new Map([
  ["country", "country"], ["status", "status"],
  ["work_mode", "work_mode"], ["difficulty", "difficulty"],
]);
const writableFields = new Set(["status", "difficulty", "notes", "priority", "resume_version", "apply_method", "applied_at"]);

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

function getJobs(db, url) {
  const clauses = [];
  const params = [];
  const search = url.searchParams.get("search")?.trim();
  if (search) {
    clauses.push("(company LIKE ? OR title LIKE ? OR target_role LIKE ? OR location LIKE ? OR notes LIKE ?)");
    params.push(...Array(5).fill(`%${search}%`));
  }
  for (const [queryName, column] of allowedFilters) {
    const value = url.searchParams.get(queryName);
    if (value) { clauses.push(`${column} = ?`); params.push(value); }
  }
  const minimum = Number(url.searchParams.get("min_compatibility") || 0);
  if (minimum > 0) { clauses.push("compatibility >= ?"); params.push(minimum); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db.prepare(`SELECT * FROM jobs ${where} ORDER BY compatibility DESC, id DESC`).all(...params);
}

function getMeta(db) {
  const summary = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'Applied' THEN 1 ELSE 0 END) AS sent,
      SUM(CASE WHEN status IN ('Queue', 'Reviewing', 'CV tailored', 'Interview') THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'Reviewing' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS discarded,
      SUM(CASE WHEN country = 'Brazil' AND status = 'Applied' THEN 1 ELSE 0 END) AS sent_brazil,
      SUM(CASE WHEN country = 'Portugal' AND status = 'Applied' THEN 1 ELSE 0 END) AS sent_portugal,
      MAX(updated_at) AS updated_at
    FROM jobs
  `).get();
  const options = {};
  for (const field of ["country", "status", "work_mode", "difficulty"]) {
    options[field] = db.prepare(`SELECT DISTINCT ${field} AS value FROM jobs ORDER BY ${field}`).all().map((row) => row.value);
  }
  return { summary, options, demo: true };
}

async function updateJob(db, req, res, id) {
  const body = await readBody(req);
  const entries = Object.entries(body).filter(([key]) => writableFields.has(key));
  if (!entries.length) return json(res, 400, { error: "No editable field supplied" });
  const current = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  if (!current) return json(res, 404, { error: "Job not found" });
  const setters = entries.map(([key]) => `${key} = ?`);
  const values = entries.map(([, value]) => value || null);
  db.exec("BEGIN");
  try {
    db.prepare(`UPDATE jobs SET ${setters.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
    if (body.status && body.status !== current.status) {
      db.prepare("INSERT INTO application_events (job_id, event_type, status, details) VALUES (?, 'status_changed', ?, ?)")
        .run(id, body.status, body.notes || null);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return json(res, 200, db.prepare("SELECT * FROM jobs WHERE id = ?").get(id));
}

function serveStatic(res, distDir, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const resolved = path.resolve(distDir, requested);
  const insideDist = resolved === distDir || resolved.startsWith(`${distDir}${path.sep}`);
  const safePath = insideDist && fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved : path.join(distDir, "index.html");
  if (!fs.existsSync(safePath)) return json(res, 503, { error: "Frontend not built. Run pnpm build." });
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
  res.writeHead(200, { "Content-Type": types[path.extname(safePath)] || "application/octet-stream" });
  fs.createReadStream(safePath).pipe(res);
}

export function createAppServer({ databasePath, distDir }) {
  const db = openDemoDatabase(databasePath);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    try {
      if (req.method === "GET" && url.pathname === "/api/jobs") return json(res, 200, getJobs(db, url));
      if (req.method === "GET" && url.pathname === "/api/meta") return json(res, 200, getMeta(db));
      const match = url.pathname.match(/^\/api\/jobs\/(\d+)$/);
      if (req.method === "PATCH" && match) return await updateJob(db, req, res, Number(match[1]));
      if (url.pathname.startsWith("/api/")) return json(res, 404, { error: "Route not found" });
      return serveStatic(res, distDir, url.pathname);
    } catch (error) {
      return json(res, 500, { error: error.message });
    }
  });
  server.on("close", () => db.close());
  return server;
}
