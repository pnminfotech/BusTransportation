import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    routeCode: { type: String, required: true, unique: true, trim: true },
    routeName: { type: String, required: true, trim: true },
    busNumber: { type: String, required: true, trim: true },
    monitorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Monitor" }],
    stopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stop" }],
    status: { type: String, enum: ["active", "inactive"], default: "active" }
  },
  { timestamps: true }
);

export const Route = mongoose.model("Route", routeSchema);
