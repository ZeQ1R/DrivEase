import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }
  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireInstructor(req, res, next) {
  if (req.user.role !== "instructor") {
    return res.status(403).json({ message: "Instructors only." });
  }
  next();
}

export function requirePlatformAdmin(req, res, next) {
  if (req.user.role !== "platform_admin") {
    return res.status(403).json({ message: "Platform admin only." });
  }
  next();
}
