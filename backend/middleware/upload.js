import multer from "multer";
import path from "path";
import crypto from "crypto";

const ALLOWED_MIME = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".pdf"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.includes(file.mimetype) || !ALLOWED_EXT.includes(ext)) {
    return cb(new Error("Only JPG, PNG or PDF files are allowed."));
  }
  cb(null, true);
};

const randomName = (prefix) => (req, file, cb) =>
  cb(null, prefix + crypto.randomBytes(16).toString("hex") + path.extname(file.originalname).toLowerCase());

const schoolStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/schools"),
  filename: randomName("school-"),
});
export const uploadSchool = multer({
  storage: schoolStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const idStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/documents"),
  filename: randomName("id-"),
});
export const uploadId = multer({
  storage: idStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
