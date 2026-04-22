import mongoose from "mongoose";

const routeChangeRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    currentRouteId: { type: mongoose.Schema.Types.ObjectId, ref: "Route" },
    requestedRouteId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    currentStopId: { type: mongoose.Schema.Types.ObjectId, ref: "Stop" },
    requestedStopId: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", required: true },
    reason: { type: String, required: true, trim: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    requestRole: { type: String, enum: ["admin", "monitor"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminRemark: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

export const RouteChangeRequest = mongoose.model("RouteChangeRequest", routeChangeRequestSchema);
