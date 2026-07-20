import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import multer from "multer";
import { cors } from "./middleware/cors.js";
import authRoutes from "./routes/auth.routes.js";
import schoolsRoutes from "./routes/schools.routes.js";
import registrationsRoutes from "./routes/registrations.routes.js";
import slotsRoutes from "./routes/slots.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import instructorsRoutes from "./routes/instructors.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import documentsRoutes from "./routes/documents.routes.js";

const app = express();
app.disable("etag");
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

app.use("/uploads/schools", express.static("uploads/schools"));
app.use(bodyParser.json({ limit: "100kb" }));
app.use(cors);

app.use("/auth", authRoutes);
app.use(schoolsRoutes);
app.use(registrationsRoutes);
app.use(slotsRoutes);
app.use(bookingsRoutes);
app.use(instructorsRoutes);
app.use(reviewsRoutes);
app.use(notificationsRoutes);
app.use(documentsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found." });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "That file is too large. Maximum size is 5MB."
      : "Upload failed. Please try again.";
    return res.status(400).json({ message });
  }
  if (err?.message?.startsWith("Only JPG")) {
    return res.status(400).json({ message: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

app.listen(3000, () => {
  console.log("Backend server listening on port 3000");
});
