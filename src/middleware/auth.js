import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Admin } from "../models/Admin.js";
import { Monitor } from "../models/Monitor.js";
import { ApiError } from "../utils/ApiError.js";

export async function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return next(new ApiError(401, "Authentication required"));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const model = payload.role === "admin" ? Admin : Monitor;
    const user = await model.findById(payload.id).lean();

    if (!user) {
      return next(new ApiError(401, "User not found"));
    }

    req.user = {
      id: user._id,
      role: payload.role,
      email: user.email,
      fullName: user.fullName || user.name
    };
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Access denied"));
    }
    next();
  };
}
