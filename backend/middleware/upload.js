import multer from "multer";
import path from "path";

const schoolStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/schools"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
export const uploadSchool = multer({ storage: schoolStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const idStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/documents"),
  filename: (req, file, cb) => cb(null, "id-" + Date.now() + path.extname(file.originalname)),
});
export const uploadId = multer({ storage: idStorage, limits: { fileSize: 5 * 1024 * 1024 } });
