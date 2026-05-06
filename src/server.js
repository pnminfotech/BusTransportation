import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { startMonthlyReportScheduler } from "./services/reportScheduler.js";

async function start() {
  await connectDb();
  startMonthlyReportScheduler();
  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
