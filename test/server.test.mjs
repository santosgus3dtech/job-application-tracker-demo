import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { createAppServer } from "../server/app.mjs";

async function withServer(run) {
  const server = createAppServer({ databasePath: ":memory:", distDir: path.resolve("dist") });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("demo API exposes only synthetic jobs and filter metadata", async () => {
  await withServer(async (baseUrl) => {
    const jobs = await fetch(`${baseUrl}/api/jobs?country=Canada&min_compatibility=60`).then((response) => response.json());
    assert.ok(jobs.length > 0);
    assert.ok(jobs.every((job) => job.country === "Canada" && job.url.startsWith("https://example.com/")));
    const meta = await fetch(`${baseUrl}/api/meta`).then((response) => response.json());
    assert.equal(meta.demo, true);
    assert.equal(meta.summary.total, 32);
  });
});

test("editable fields can change while arbitrary columns are ignored", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/jobs/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Interview", company: "Injected Company" }),
    });
    assert.equal(response.status, 200);
    const job = await response.json();
    assert.equal(job.status, "Interview");
    assert.notEqual(job.company, "Injected Company");
  });
});
