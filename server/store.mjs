import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const companies = [
  "Northstar Labs", "Maple Byte", "Atlantic Cloud", "Lumen Data",
  "Harbor Systems", "Pixel Foundry", "Cedar Analytics", "Orbit Works",
];
const roles = [
  ["Junior Python Developer", "Backend Python"],
  ["Data Analyst", "Data and Analytics"],
  ["Application Support Engineer", "Application Support"],
  ["QA Automation Engineer", "Quality Engineering"],
];
const locations = [
  ["Brazil", "Sao Paulo", "Remote"],
  ["Portugal", "Porto", "Hybrid"],
  ["Canada", "Toronto", "Remote"],
];
const statuses = ["Queue", "Reviewing", "CV tailored", "Applied", "Interview", "Rejected"];
const difficulties = ["Easy", "Medium", "Complex"];

export function openDemoDatabase(databasePath) {
  if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY,
      collected_at TEXT,
      country TEXT NOT NULL,
      target_role TEXT,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      city TEXT,
      location TEXT,
      work_mode TEXT,
      source TEXT,
      source_job_id TEXT,
      recency TEXT,
      url TEXT NOT NULL UNIQUE,
      technical_score REAL,
      seniority_score REAL,
      location_score REAL,
      market_language_score REAL,
      deviation_penalty REAL,
      compatibility INTEGER NOT NULL CHECK (compatibility BETWEEN 0 AND 100),
      fit_band TEXT,
      priority TEXT,
      difficulty TEXT NOT NULL,
      resume_path TEXT,
      resume_version TEXT,
      fit_reason TEXT,
      cv_adjustment TEXT,
      status TEXT NOT NULL,
      apply_method TEXT,
      account_profile TEXT,
      applied_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS application_events (
      id INTEGER PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      status TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_country_status ON jobs(country, status);
    CREATE INDEX IF NOT EXISTS idx_jobs_compatibility ON jobs(compatibility DESC);
  `);

  const count = db.prepare("SELECT COUNT(*) AS count FROM jobs").get().count;
  if (!count) seedDemoData(db);
  return db;
}

export function seedDemoData(db) {
  const insert = db.prepare(`
    INSERT INTO jobs (
      collected_at, country, target_role, company, title, city, location,
      work_mode, source, source_job_id, recency, url, compatibility, fit_band,
      priority, difficulty, resume_version, fit_reason, cv_adjustment, status,
      apply_method, account_profile, applied_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const event = db.prepare(`
    INSERT INTO application_events (job_id, event_type, status, details)
    VALUES (?, 'demo_seeded', ?, 'Synthetic portfolio fixture')
  `);

  db.exec("BEGIN");
  try {
    for (let index = 0; index < 32; index += 1) {
      const [title, targetRole] = roles[index % roles.length];
      const [country, city, workMode] = locations[index % locations.length];
      const status = statuses[index % statuses.length];
      const compatibility = 48 + ((index * 7) % 49);
      const difficulty = difficulties[index % difficulties.length];
      const appliedAt = ["Applied", "Interview"].includes(status)
        ? `2026-09-${String((index % 24) + 1).padStart(2, "0")}`
        : null;
      const result = insert.run(
        "2026-10-01T12:00:00Z", country, targetRole, companies[index % companies.length],
        title, city, `${city}, ${country}`, workMode, "Demo board", `DEMO-${1000 + index}`,
        index < 10 ? "This week" : "This month", `https://example.com/jobs/demo-${index + 1}`,
        compatibility, compatibility >= 80 ? "Strong" : compatibility >= 65 ? "Good" : "Adjacent",
        compatibility >= 80 ? "High" : compatibility >= 65 ? "Medium" : "Low", difficulty,
        `${targetRole} CV`, "Stack, level and work arrangement align with the demo profile.",
        "Lead with measurable Python, SQL, API and operations outcomes.", status,
        index % 2 ? "Company portal" : "Easy apply", country, appliedAt,
        "Synthetic record created for the public portfolio demo.",
      );
      event.run(result.lastInsertRowid, status);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
