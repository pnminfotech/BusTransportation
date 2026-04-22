import mongoose from "mongoose";
import { env } from "./env.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildConnectionHelp(error) {
  const text = `${error?.message || ""} ${error?.cause?.message || ""}`.toLowerCase();

  if (text.includes("tls") || text.includes("ssl")) {
    return [
      "Atlas TLS handshake failed.",
      "Check Atlas Network Access and try a different network or mobile hotspot.",
      "The app now forces IPv4 by default, which helps on some Windows and office-network setups."
    ].join(" ");
  }

  if (text.includes("authentication failed")) {
    return "Atlas rejected the database username or password in MONGODB_URI.";
  }

  if (text.includes("querysrv") || text.includes("dns")) {
    return "DNS resolution for the Atlas SRV record failed. Try a different network or DNS resolver.";
  }

  return "Check Atlas Network Access, database user permissions, and whether your network, firewall, antivirus, proxy, or VPN is intercepting TLS.";
}

export async function connectDb() {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  mongoose.set("strictQuery", true);

  const options = {
    family: env.mongoUseIpv4 ? 4 : 0,
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
    socketTimeoutMS: env.mongoSocketTimeoutMs
  };

  let lastError;

  for (let attempt = 1; attempt <= env.mongoConnectRetries; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, options);
      console.log("MongoDB connected");
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `MongoDB connection attempt ${attempt}/${env.mongoConnectRetries} failed: ${error.message}`
      );

      if (attempt < env.mongoConnectRetries) {
        await sleep(env.mongoRetryDelayMs);
      }
    }
  }

  const wrappedError = new Error(`${lastError.message}\n${buildConnectionHelp(lastError)}`);
  wrappedError.cause = lastError;
  throw wrappedError;
}
