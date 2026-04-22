import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import monitorRoutes from "./routes/monitorRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Transport management API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/monitor", monitorRoutes);

app.use(errorHandler);

export default app;
