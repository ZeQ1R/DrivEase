import express from "express";
import bodyParser from "body-parser";
import { cors } from "./middleware/cors.js";
import authRoutes from "./routes/auth.routes.js";
import schoolsRoutes from "./routes/schools.routes.js";
import registrationsRoutes from "./routes/registrations.routes.js";
import slotsRoutes from "./routes/slots.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import instructorsRoutes from "./routes/instructors.routes.js";

const app = express();
app.disable("etag");

app.use("/uploads", express.static("uploads"));
app.use(bodyParser.json());
app.use(cors);

app.use("/auth", authRoutes);
app.use(schoolsRoutes);
app.use(registrationsRoutes);
app.use(slotsRoutes);
app.use(bookingsRoutes);
app.use(instructorsRoutes);

app.listen(3000, () => {
  console.log("Backend server listening on port 3000");
});
