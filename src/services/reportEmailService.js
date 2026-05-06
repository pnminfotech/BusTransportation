import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { ReportMailLog } from "../models/ReportMailLog.js";
import { buildCsvReport, buildMonthlyTransportReport, buildReportFileName } from "./reportingService.js";

function formatMonthLabel(reportMonth) {
  const [year, month] = reportMonth.split("-");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getTransporter() {
  if (!env.smtpHost || !env.smtpPort || !env.smtpUser || !env.smtpPass) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });
}

function buildHtmlEmail(report, companySection = null) {
  const scopedSummary = companySection
    ? [
        {
          companyName: companySection.companyName,
          employeeCount: companySection.employeeCount,
          plants: companySection.plants
        }
      ]
    : report.summary;

  const scopedEmployees = companySection ? companySection.employees : report.employees;
  const totalEmployees = companySection ? companySection.employeeCount : report.totalEmployees;

  const summaryRows = scopedSummary
    .flatMap((company) =>
      company.plants.map(
        (plant) => `
          <tr>
            <td>${escapeHtml(company.companyName)}</td>
            <td>${escapeHtml(plant.plantName)}</td>
            <td style="text-align:right;">${plant.employeeCount}</td>
          </tr>`
      )
    )
    .join("");

  const detailRows = scopedEmployees
    .map(
      (employee) => `
        <tr>
          <td>${escapeHtml(employee.employeeCode)}</td>
          <td>${escapeHtml(employee.employeeName)}</td>
          <td>${escapeHtml(employee.companyName)}</td>
          <td>${escapeHtml(employee.plantName)}</td>
          <td>${escapeHtml(employee.routeOrPickupPoint)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#eef2f7;font-family:Segoe UI,Arial,sans-serif;color:#162032;">
    <div style="max-width:980px;margin:0 auto;padding:28px 18px;">
      <div style="background:linear-gradient(135deg,#14324d,#0a6c74);color:#fff;border-radius:20px;padding:28px 30px;">
        <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;opacity:0.8;">Monthly Transport Report</div>
        <h1 style="margin:10px 0 8px;font-size:28px;line-height:1.1;">Employee Bus Transportation Summary</h1>
        <p style="margin:0;font-size:15px;opacity:0.9;">Reporting month: ${escapeHtml(formatMonthLabel(report.reportMonth))}</p>
      </div>
      <div style="background:#fff;border-radius:20px;padding:24px 24px 30px;margin-top:18px;border:1px solid #d7dfeb;">
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px;">
          <div style="flex:1 1 220px;background:#f7fbfb;border:1px solid #dcebed;border-radius:16px;padding:16px;">
            <div style="font-size:13px;color:#5f6f85;">Total Employees Using Transport</div>
            <div style="margin-top:8px;font-size:30px;font-weight:700;color:#10243d;">${totalEmployees}</div>
          </div>
          <div style="flex:1 1 220px;background:#fff8ef;border:1px solid #f1dfc5;border-radius:16px;padding:16px;">
            <div style="font-size:13px;color:#5f6f85;">Report Scope</div>
            <div style="margin-top:8px;font-size:18px;font-weight:700;color:#10243d;">${escapeHtml(
              companySection ? companySection.companyName : "All Companies"
            )}</div>
          </div>
        </div>

        <h2 style="margin:0 0 12px;font-size:20px;color:#10243d;">Summary Table</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f4f7fb;">
              <th style="text-align:left;padding:12px;border:1px solid #e5ebf3;">Company</th>
              <th style="text-align:left;padding:12px;border:1px solid #e5ebf3;">Plant</th>
              <th style="text-align:right;padding:12px;border:1px solid #e5ebf3;">Employee Count</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
        </table>

        <h2 style="margin:24px 0 12px;font-size:20px;color:#10243d;">Detailed Employee Table</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f4f7fb;">
              <th style="text-align:left;padding:10px;border:1px solid #e5ebf3;">Employee Code</th>
              <th style="text-align:left;padding:10px;border:1px solid #e5ebf3;">Employee Name</th>
              <th style="text-align:left;padding:10px;border:1px solid #e5ebf3;">Company</th>
              <th style="text-align:left;padding:10px;border:1px solid #e5ebf3;">Plant</th>
              <th style="text-align:left;padding:10px;border:1px solid #e5ebf3;">Route / Pickup Point</th>
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>

        <p style="margin:20px 0 0;color:#5f6f85;font-size:13px;">This email was generated automatically by the transport management system.</p>
      </div>
    </div>
  </body>
</html>`;
}

async function saveMailLog({
  reportMonth,
  companyName = "",
  deliveryMode,
  recipients,
  ccRecipients,
  subject,
  status,
  errorMessage = "",
  totalEmployees,
  summary,
  employees,
  attachmentFormat,
  triggeredBy
}) {
  return ReportMailLog.create({
    reportMonth,
    companyName,
    deliveryMode,
    recipients,
    ccRecipients,
    subject,
    status,
    errorMessage,
    totalEmployees,
    summary,
    employees,
    attachmentFormat,
    triggeredBy,
    sentAt: new Date()
  });
}

export async function sendMonthlyTransportReport({
  month,
  companyName = "",
  mode = "consolidated",
  attachmentFormat = "csv",
  adminRecipients = [],
  triggeredBy = { source: "manual", role: "", name: "" }
}) {
  const report = await buildMonthlyTransportReport({ month, companyName });
  const transporter = getTransporter();
  const monthLabel = formatMonthLabel(report.reportMonth);
  const results = [];

  if (mode === "company-wise") {
    for (const companySection of report.groupedCompanies) {
      const recipients = companySection.reportEmails || [];
      const ccRecipients = companySection.ccEmails || [];
      const subject = `Monthly Bus Transportation Report - ${companySection.companyName} - ${monthLabel}`;
      const scopedReport = {
        ...report,
        summary: [
          {
            companyName: companySection.companyName,
            employeeCount: companySection.employeeCount,
            plants: companySection.plants
          }
        ],
        employees: companySection.employees,
        totalEmployees: companySection.employeeCount
      };

      if (!recipients.length) {
        await saveMailLog({
          reportMonth: report.reportMonth,
          companyName: companySection.companyName,
          deliveryMode: mode,
          recipients,
          ccRecipients,
          subject,
          status: "skipped",
          errorMessage: "No company recipient emails configured",
          totalEmployees: companySection.employeeCount,
          summary: scopedReport.summary,
          employees: scopedReport.employees,
          attachmentFormat,
          triggeredBy
        });
        results.push({
          companyName: companySection.companyName,
          status: "skipped",
          message: "No company recipient emails configured"
        });
        continue;
      }

      try {
        if (!transporter) {
          throw new Error("SMTP is not configured");
        }

        await transporter.sendMail({
          from: env.mailFrom,
          to: recipients.join(", "),
          cc: ccRecipients.join(", ") || undefined,
          subject,
          html: buildHtmlEmail(report, companySection),
          attachments: [
            {
              filename: buildReportFileName(report.reportMonth, "csv", companySection.companyName),
              content: buildCsvReport(scopedReport),
              contentType: "text/csv"
            }
          ]
        });

        await saveMailLog({
          reportMonth: report.reportMonth,
          companyName: companySection.companyName,
          deliveryMode: mode,
          recipients,
          ccRecipients,
          subject,
          status: "sent",
          totalEmployees: companySection.employeeCount,
          summary: scopedReport.summary,
          employees: scopedReport.employees,
          attachmentFormat,
          triggeredBy
        });
        results.push({ companyName: companySection.companyName, status: "sent" });
      } catch (error) {
        await saveMailLog({
          reportMonth: report.reportMonth,
          companyName: companySection.companyName,
          deliveryMode: mode,
          recipients,
          ccRecipients,
          subject,
          status: "failed",
          errorMessage: error.message,
          totalEmployees: companySection.employeeCount,
          summary: scopedReport.summary,
          employees: scopedReport.employees,
          attachmentFormat,
          triggeredBy
        });
        results.push({
          companyName: companySection.companyName,
          status: "failed",
          message: error.message
        });
      }
    }

    return { reportMonth: report.reportMonth, mode, results };
  }

  const recipients = adminRecipients.length ? adminRecipients : emailList(env.reportAdminEmails || env.adminEmail);
  const ccRecipients = emailList(env.reportAdminCcEmails);
  const subject = `Monthly Bus Transportation Report - ${monthLabel}`;

  try {
    if (!recipients.length) {
      throw new Error("No consolidated admin recipients configured");
    }

    if (!transporter) {
      throw new Error("SMTP is not configured");
    }

    await transporter.sendMail({
      from: env.mailFrom,
      to: recipients.join(", "),
      cc: ccRecipients.join(", ") || undefined,
      subject,
      html: buildHtmlEmail(report),
      attachments: [
        {
          filename: buildReportFileName(report.reportMonth, "csv", report.filterCompanyName),
          content: buildCsvReport(report),
          contentType: "text/csv"
        }
      ]
    });

    await saveMailLog({
      reportMonth: report.reportMonth,
      companyName: report.filterCompanyName,
      deliveryMode: mode,
      recipients,
      ccRecipients,
      subject,
      status: "sent",
      totalEmployees: report.totalEmployees,
      summary: report.summary,
      employees: report.employees,
      attachmentFormat,
      triggeredBy
    });

    return { reportMonth: report.reportMonth, mode, results: [{ status: "sent" }] };
  } catch (error) {
    await saveMailLog({
      reportMonth: report.reportMonth,
      companyName: report.filterCompanyName,
      deliveryMode: mode,
      recipients,
      ccRecipients,
      subject,
      status: "failed",
      errorMessage: error.message,
      totalEmployees: report.totalEmployees,
      summary: report.summary,
      employees: report.employees,
      attachmentFormat,
      triggeredBy
    });

    return {
      reportMonth: report.reportMonth,
      mode,
      results: [{ status: "failed", message: error.message }]
    };
  }
}
