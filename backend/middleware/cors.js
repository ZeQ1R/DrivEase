const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.APP_URL || "http://localhost:4200")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function cors(req, res, next) {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}
