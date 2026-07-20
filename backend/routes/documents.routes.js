import { Router } from "express";
import path from "path";
import fs from "fs";
import pool from "../config/database.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const DOCUMENTS_DIR = path.resolve("uploads/documents");

router.get("/documents/:file", authenticate, async (req, res) => {
  try {
    const { file } = req.params;

    if (!/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..")) {
      return res.status(400).json({ message: "Invalid file name." });
    }

    const stored = `uploads/documents/${file}`;
    const result = await pool.query(
      `SELECT r.student_id, s.owner_user_id
         FROM registration_details d
         JOIN registrations r ON r.id = d.registration_id
         JOIN driving_schools s ON s.id = r.school_id
        WHERE d.id_document_url = $1`,
      [stored]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Document not found." });
    }

    const { student_id, owner_user_id } = result.rows[0];
    const isOwner = req.user.id === student_id;
    const isSchoolAdmin = req.user.id === owner_user_id;
    const isPlatformAdmin = req.user.role === "platform_admin";

    if (!isOwner && !isSchoolAdmin && !isPlatformAdmin) {
      return res.status(403).json({ message: "You are not allowed to view this document." });
    }

    const absolute = path.join(DOCUMENTS_DIR, file);
    if (!absolute.startsWith(DOCUMENTS_DIR + path.sep) || !fs.existsSync(absolute)) {
      return res.status(404).json({ message: "Document not found." });
    }

    res.setHeader("Content-Disposition", `inline; filename="${file}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    res.sendFile(absolute);
  } catch (error) {
    console.error("Failed to serve document:", error);
    res.status(500).json({ message: "Could not load the document." });
  }
});

export default router;
