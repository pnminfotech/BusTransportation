import mongoose from "mongoose";

const stopSchema = new mongoose.Schema(
  {
    stopName: { type: String, required: true, trim: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    stopOrder: { type: Number, default: 1 },
    status: { type: String, enum: ["active", "inactive"], default: "active" }
  },
  { timestamps: true }
);

stopSchema.index({ routeId: 1, stopName: 1 }, { unique: true });

export const Stop = mongoose.model("Stop", stopSchema);
