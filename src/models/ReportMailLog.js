import mongoose from "mongoose";

const reportSummaryPlantSchema = new mongoose.Schema(
  {
    plantName: { type: String, trim: true, default: "" },
    employeeCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const reportSummaryCompanySchema = new mongoose.Schema(
  {
    companyName: { type: String, trim: true, default: "" },
    employeeCount: { type: Number, default: 0 },
    plants: [reportSummaryPlantSchema]
  },
  { _id: false }
);

const reportEmployeeSnapshotSchema = new mongoose.Schema(
  {
    employeeCode: { type: String, trim: true, default: "" },
    employeeName: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    plantName: { type: String, trim: true, default: "" },
    routeOrPickupPoint: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const reportMailLogSchema = new mongoose.Schema(
  {
    reportMonth: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: "" },
    deliveryMode: {
      type: String,
      enum: ["consolidated", "company-wise"],
      required: true
    },
    recipients: [{ type: String, trim: true, lowercase: true }],
    ccRecipients: [{ type: String, trim: true, lowercase: true }],
    subject: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["sent", "failed", "skipped"],
      default: "skipped"
    },
    errorMessage: { type: String, trim: true, default: "" },
    totalEmployees: { type: Number, default: 0 },
    summary: [reportSummaryCompanySchema],
    employees: [reportEmployeeSnapshotSchema],
    attachmentFormat: { type: String, trim: true, default: "csv" },
    triggeredBy: {
      source: {
        type: String,
        enum: ["manual", "scheduler"],
        default: "manual"
      },
      userId: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String, trim: true, default: "" },
      name: { type: String, trim: true, default: "" }
    },
    sentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

reportMailLogSchema.index({ reportMonth: 1, deliveryMode: 1, companyName: 1, sentAt: -1 });

export const ReportMailLog = mongoose.model("ReportMailLog", reportMailLogSchema);
