import { connectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { Admin } from "../models/Admin.js";
import { hashPassword } from "../utils/password.js";

async function run() {
  await connectDb();

  const email = env.adminEmail.toLowerCase();
  const password = await hashPassword(env.adminPassword);

  const admin = await Admin.findOneAndUpdate(
    { email },
    {
      name: env.adminName,
      email,
      password,
      role: "admin"
    },
    {
      new: true,
      upsert: true
    }
  );

  console.log(`Admin ready: ${admin.email}`);
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
