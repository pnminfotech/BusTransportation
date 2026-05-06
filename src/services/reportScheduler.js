import cron from "node-cron";
import { env } from "../config/env.js";
import { ReportMailLog } from "../models/ReportMailLog.js";
import { sendMonthlyTransportReport } from "./reportEmailService.js";
import { getPreviousMonth } from "./reportingService.js";

let schedulerStarted = false;

export function startMonthlyReportScheduler() {
  if (schedulerStarted || !env.monthlyReportSchedulerEnabled) {
    return;
  }

  cron.schedule(env.monthlyReportCron, async () => {
    try {
      const targetMonth = env.monthlyReportTargetMonth === "previous" ? getPreviousMonth() : undefined;

      const existingLog = await ReportMailLog.findOne({
        reportMonth: targetMonth,
        deliveryMode: env.monthlyReportMode,
        "triggeredBy.source": "scheduler",
        status: "sent"
      }).lean();

      if (existingLog) {
        return;
      }

      await sendMonthlyTransportReport({
        month: targetMonth,
        mode: env.monthlyReportMode,
        triggeredBy: {
          source: "scheduler",
          role: "system",
          name: "Monthly Scheduler"
        }
      });
    } catch (error) {
      console.error("Monthly report scheduler failed", error);
    }
  });

  schedulerStarted = true;
}
