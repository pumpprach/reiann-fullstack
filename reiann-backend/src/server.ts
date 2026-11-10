import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { HttpError } from "./db.js";
import { env, frontendOrigin } from "./env.js";
import { route } from "./routes.js";

const MAX_BODY_BYTES = 256 * 1024;

async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method === "GET" || req.method === "DELETE") return undefined;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += data.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Request is too large");
    chunks.push(data);
  }
  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && origin !== frontendOrigin) {
    json(res, 403, { error: "Origin not allowed" });
    return;
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", frontendOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    const body = await readBody(req);
    const data = await route(req.method ?? "GET", path, body, req.headers.authorization);
    json(res, 200, { data });
  } catch (error) {
    if (error instanceof ZodError) {
      json(res, 400, { error: "Invalid request data", details: error.issues.map((i) => ({
        path: i.path.join("."), message: i.message,
      })) });
    } else if (error instanceof HttpError) {
      json(res, error.status, { error: error.message });
    } else {
      console.error(error);
      json(res, 500, { error: "Internal server error" });
    }
  }
}

const server = createServer((req, res) => { void handle(req, res); });
server.listen(env.PORT, "0.0.0.0", () => {
  console.log(`Reiann API listening on port ${env.PORT}`);
});
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
