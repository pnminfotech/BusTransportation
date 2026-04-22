import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  mongoUseIpv4: process.env.MONGODB_USE_IPV4 !== "false",
  mongoServerSelectionTimeoutMs: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
  mongoSocketTimeoutMs: Number(process.env.MONGODB_SOCKET_TIMEOUT_MS || 45000),
  mongoConnectRetries: Number(process.env.MONGODB_CONNECT_RETRIES || 3),
  mongoRetryDelayMs: Number(process.env.MONGODB_RETRY_DELAY_MS || 2000),
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  adminName: process.env.ADMIN_NAME || "Transport Admin",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@123"
};
