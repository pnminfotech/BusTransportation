import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true, default: "" },
    reportEmails: [{ type: String, trim: true, lowercase: true }],
    ccEmails: [{ type: String, trim: true, lowercase: true }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Company = mongoose.model("Company", companySchema);
