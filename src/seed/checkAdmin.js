import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { Admin } from "../models/Admin.js";
import { comparePassword } from "../utils/password.js";

async function run() {
  await connectDb();

  const email = env.adminEmail.trim().toLowerCase();
  const admin = await Admin.findOne({ email });

  if (!admin) {
    console.log(`No admin found for ${email}`);
    process.exit(1);
  }

  const passwordMatches = await comparePassword(env.adminPassword, admin.password);

  console.log(`Admin found: ${admin.email}`);
  console.log(`Password matches .env: ${passwordMatches ? "YES" : "NO"}`);
  process.exit(passwordMatches ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
