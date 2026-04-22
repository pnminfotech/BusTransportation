import mongoose from "mongoose";

const monitorSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    userId: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    assignedRoutes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Route" }],
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    lastPasswordChangedAt: { type: Date }
  },
  { timestamps: true }
);

export const Monitor = mongoose.model("Monitor", monitorSchema);
