const { spawn } = require("node:child_process");
const { once } = require("node:events");
const {
  after,
  before,
  test,
} = require("node:test");
const assert = require("node:assert/strict");

const PORT = 3107;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let server;

async function waitForApi(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error("API server exited before becoming ready");
    }

    try {
      const response = await fetch(`${BASE_URL}/todos`);

      if (response.status === 200) {
        return;
      }
    } catch {
      // API may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("API did not become ready within 30 seconds");
}

before(async () => {
  server = spawn("node", ["src/server.js"], {
    env: {
      ...process.env,
      PORT: String(PORT),
      MONGO_URI:
        process.env.MONGO_URI ||
        "mongodb://127.0.0.1:27017/tododb_test",
    },
    stdio: "inherit",
  });

  await waitForApi();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);

    if (server.exitCode === null) {
      server.kill("SIGKILL");
    }
  }
});

test("Todo API supports CRUD and validates input", async () => {
  // Reject an empty title.
  const invalidResponse = await fetch(`${BASE_URL}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "   " }),
  });

  assert.equal(invalidResponse.status, 400);

  // Create a Todo.
  const createResponse = await fetch(`${BASE_URL}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "CI integration test",
      completed: false,
    }),
  });

  assert.equal(createResponse.status, 201);

  const created = await createResponse.json();
  assert.equal(created.title, "CI integration test");
  assert.equal(created.completed, false);
  assert.ok(created._id);

  try {
    // Read the Todo.
    const getResponse = await fetch(
      `${BASE_URL}/todos/${created._id}`
    );

    assert.equal(getResponse.status, 200);

    const fetched = await getResponse.json();
    assert.equal(fetched._id, created._id);

    // Update the Todo.
    const updateResponse = await fetch(
      `${BASE_URL}/todos/${created._id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      }
    );

    assert.equal(updateResponse.status, 200);

    const updated = await updateResponse.json();
    assert.equal(updated.completed, true);

    // Delete the Todo.
    const deleteResponse = await fetch(
      `${BASE_URL}/todos/${created._id}`,
      { method: "DELETE" }
    );

    assert.equal(deleteResponse.status, 200);

    // Confirm it no longer exists.
    const missingResponse = await fetch(
      `${BASE_URL}/todos/${created._id}`
    );

    assert.equal(missingResponse.status, 404);
  } finally {
    // Clean up the test record if an assertion fails.
    await fetch(`${BASE_URL}/todos/${created._id}`, {
      method: "DELETE",
    }).catch(() => {});
  }
});
