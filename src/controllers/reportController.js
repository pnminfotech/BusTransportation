import { Company } from "../models/Company.js";
import { ReportMailLog } from "../models/ReportMailLog.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendMonthlyTransportReport } from "../services/reportEmailService.js";
import {
  buildCsvReport,
  buildMonthlyTransportReport,
  buildReportFileName,
  getCompanyConfigurations,
  upsertCompanyConfiguration
} from "../services/reportingService.js";

export const getMonthlyTransportReport = asyncHandler(async (req, res) => {
  const report = await buildMonthlyTransportReport({
    month: req.query.month,
    companyName: req.query.companyName
  });

  res.json({ success: true, data: report });
});

export const exportMonthlyTransportReport = asyncHandler(async (req, res) => {
  const report = await buildMonthlyTransportReport({
    month: req.query.month,
    companyName: req.query.companyName
  });

  const csv = buildCsvReport(report);
  const fileName = buildReportFileName(report.reportMonth, "csv", req.query.companyName);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(csv);
});

export const sendMonthlyTransportReportNow = asyncHandler(async (req, res) => {
  const result = await sendMonthlyTransportReport({
    month: req.body.month,
    companyName: req.body.companyName,
    mode: req.body.mode,
    adminRecipients: req.body.adminRecipients || [],
    attachmentFormat: "csv",
    triggeredBy: {
      source: "manual",
      userId: req.user.id,
      role: req.user.role,
      name: req.user.fullName || req.user.email
    }
  });

  res.json({ success: true, data: result });
});

export const getReportHistory = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.month) {
    filter.reportMonth = req.query.month;
  }

  if (req.query.companyName) {
    filter.companyName = req.query.companyName;
  }

  const logs = await ReportMailLog.find(filter).sort({ sentAt: -1, createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: logs });
});

export const getReportCompanies = asyncHandler(async (_req, res) => {
  const companies = await getCompanyConfigurations();
  res.json({ success: true, data: companies });
});

export const updateReportCompany = asyncHandler(async (req, res) => {
  try {
    const company = await upsertCompanyConfiguration(req.params.id, req.body);
    res.json({ success: true, data: company });
  } catch (error) {
    throw new ApiError(404, error.message);
  }
});

export const getReportSchedulerStatus = asyncHandler(async (_req, res) => {
  const companyCount = await Company.countDocuments();

  res.json({
    success: true,
    data: {
      enabled: env.monthlyReportSchedulerEnabled,
      cron: env.monthlyReportCron,
      deliveryMode: env.monthlyReportMode,
      targetMonth: env.monthlyReportTargetMonth,
      smtpConfigured: Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass),
      companyConfigurations: companyCount
    }
  });
});
