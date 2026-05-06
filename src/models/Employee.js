import mongoose from "mongoose";

const assignmentHistorySchema = new mongoose.Schema(
  {
    fromRouteId: { type: mongoose.Schema.Types.ObjectId, ref: "Route" },
    toRouteId: { type: mongoose.Schema.Types.ObjectId, ref: "Route" },
    fromStopId: { type: mongoose.Schema.Types.ObjectId, ref: "Stop" },
    toStopId: { type: mongoose.Schema.Types.ObjectId, ref: "Stop" },
    changedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      role: { type: String, enum: ["admin", "monitor"] }
    },
    note: String,
    changedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    division: { type: String, required: true, trim: true },
    employeeCode: { type: String, required: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    gender: { type: String, trim: true, enum: ["Male", "Female"], default: "" },
    residentAddress: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    officialEmail: { type: String, required: true, trim: true, lowercase: true },
    submittedRoute: { type: String, trim: true, default: "" },
    submittedStop: { type: String, trim: true, default: "" },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route" },
    stopId: { type: mongoose.Schema.Types.ObjectId, ref: "Stop" },
    declarationAccepted: { type: Boolean, default: false },
    sourceType: {
      type: String,
      enum: ["google_form", "internal_form", "import"],
      default: "google_form"
    },
    status: {
      type: String,
      enum: ["active", "pending_verification", "inactive"],
      default: "pending_verification"
    },
    remarks: { type: String, trim: true, default: "" },
    assignmentHistory: [assignmentHistorySchema]
  },
  { timestamps: true }
);

employeeSchema.index({ employeeCode: 1, officialEmail: 1 }, { unique: true });

export const Employee = mongoose.model("Employee", employeeSchema);
