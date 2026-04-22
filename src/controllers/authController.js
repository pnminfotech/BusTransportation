import { Admin } from "../models/Admin.js";
import { Monitor } from "../models/Monitor.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { generateToken } from "../utils/generateToken.js";

function authPayload(user, role) {
  return {
    token: generateToken({ id: user._id, role }),
    user: {
      id: user._id,
      role,
      name: user.name || user.fullName,
      email: user.email,
      userId: user.userId || null
    }
  };
}

export const adminLogin = asyncHandler(async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password ?? "";
  const admin = await Admin.findOne({ email });

  if (!admin || !(await comparePassword(password, admin.password))) {
    throw new ApiError(401, "Invalid admin credentials");
  }

  res.json({ success: true, data: authPayload(admin, "admin") });
});

export const monitorLogin = asyncHandler(async (req, res) => {
  const userId = req.body.userId?.trim();
  const password = req.body.password ?? "";
  const monitor = await Monitor.findOne({ userId }).populate("assignedRoutes", "routeCode routeName");

  if (!monitor || monitor.status !== "active") {
    throw new ApiError(401, "Invalid monitor account");
  }

  if (!(await comparePassword(password, monitor.passwordHash))) {
    throw new ApiError(401, "Invalid monitor credentials");
  }

  res.json({ success: true, data: authPayload(monitor, "monitor") });
});

export const changeMonitorPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const monitor = await Monitor.findById(req.user.id);

  if (!monitor) {
    throw new ApiError(404, "Monitor not found");
  }

  if (!(await comparePassword(currentPassword, monitor.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect");
  }

  monitor.passwordHash = await hashPassword(newPassword);
  monitor.lastPasswordChangedAt = new Date();
  await monitor.save();

  res.json({ success: true, message: "Password updated successfully" });
});
