/**
 * Local development server for the Samsung Reddit ORM Workbench.
 *
 * Usage:  node local-server.mjs
 *
 * Serves static files from the project root and routes API calls
 * to the Vercel-style serverless functions in /api/.
 *
 * Requires:  npm install dotenv
 * Set LLM_API_KEY and LLM_API_BASE in a .env file.
 */

import dotenv from "dotenv";
import fsync from "node:fs";
if (fsync.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import the API handlers
import fetchReddit from "./api/reddit.js";
import generateComments from "./api/generate-comments.js";
import fetchRedditSearch from "./api/reddit-search.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4180);

// MIME types for static file serving
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// ── Helpers ──────────────────────────────────────────────────────────

/** Send an HTTP response with CORS headers. */
function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    ...headers,
  });
  res.end(body);
}

/** Read the full request body as a string. */
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}

/** Create a minimal Express-like res object for the API handlers. */
function makeRes(rawRes) {
  return {
    status(code) {
      rawRes.statusCode = code;
      return this;
    },
    json(payload) {
      send(rawRes, rawRes.statusCode || 200, JSON.stringify(payload), {
        "content-type": "application/json; charset=utf-8",
      });
    },
  };
}

// ── Route mapping ────────────────────────────────────────────────────

const apiRoutes = {
  "/api/reddit": fetchReddit,
  "/api/generate-comments": generateComments,
  "/api/reddit-search": fetchRedditSearch,
};

// ── Server ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }

    // ── API routes ───────────────────────────────────────────────
    const apiHandler = apiRoutes[url.pathname];
    if (apiHandler) {
      const bodyText = await readBody(req);
      const body = bodyText ? JSON.parse(bodyText) : {};
      const apiRes = makeRes(res);
      // Simulate Vercel's req object
      await apiHandler(
        { method: req.method, body, query: Object.fromEntries(url.searchParams.entries()) },
        apiRes
      );
      return;
    }

    // ── Static files ─────────────────────────────────────────────
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.resolve(root, `.${decodeURIComponent(requested)}`);

    // Security: prevent directory traversal
    if (!filePath.toLowerCase().startsWith(root.toLowerCase())) {
      send(res, 403, "Forbidden");
      return;
    }

    const body = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    send(res, 200, body, {
      "content-type": mime[ext] || "application/octet-stream",
      "cache-control": "no-store",
    });
  } catch (err) {
    if (err.code === "ENOENT") {
      send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
    } else {
      console.error("[server] Error:", err);
      send(res, 500, "Internal server error", { "content-type": "text/plain; charset=utf-8" });
    }
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`\n  Samsung Reddit ORM Workbench`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Local:  http://127.0.0.1:${port}\n`);
});
