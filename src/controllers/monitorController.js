import { Monitor } from "../models/Monitor.js";
import { Route } from "../models/Route.js";
import { Employee } from "../models/Employee.js";
import { Stop } from "../models/Stop.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateTemporaryPassword, hashPassword } from "../utils/password.js";

async function ensureRouteAvailable(routeId, monitorIdToIgnore = null) {
  if (!routeId) {
    return;
  }

  const route = await Route.findById(routeId).lean();

  if (!route) {
    throw new ApiError(404, "Selected route not found");
  }

  const existingMonitorIds = (route.monitorIds || []).map(String);
  const occupiedByAnotherMonitor = existingMonitorIds.some((id) => id !== String(monitorIdToIgnore));

  if (occupiedByAnotherMonitor) {
    throw new ApiError(400, "This route is already assigned to another monitor");
  }
}

export const createMonitor = asyncHandler(async (req, res) => {
  const { fullName, userId, email, phone, assignedRoutes = [], password } = req.body;
  const normalizedAssignedRoutes = assignedRoutes.slice(0, 1);
  const tempPassword = password || generateTemporaryPassword();

  await ensureRouteAvailable(normalizedAssignedRoutes[0]);

  const monitor = await Monitor.create({
    fullName,
    userId,
    email,
    phone,
    assignedRoutes: normalizedAssignedRoutes,
    passwordHash: await hashPassword(tempPassword),
    createdBy: req.user.id
  });

  if (normalizedAssignedRoutes.length) {
    await Route.updateMany(
      { _id: { $in: normalizedAssignedRoutes } },
      { $addToSet: { monitorIds: monitor._id } }
    );
  }

  res.status(201).json({
    success: true,
    data: { monitor, temporaryPassword: tempPassword }
  });
});

export const getMonitors = asyncHandler(async (req, res) => {
  const { search = "", status } = req.query;
  const query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { userId: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } }
    ];
  }

  const monitors = await Monitor.find(query)
    .populate("assignedRoutes", "routeCode routeName")
    .sort({ createdAt: -1 })
    .lean();

  const enriched = await Promise.all(
    monitors.map(async (monitor) => {
      const routeIds = monitor.assignedRoutes.map((route) => route._id);
      const [stops, employeeCount] = await Promise.all([
        Stop.find({ routeId: { $in: routeIds } })
          .select("stopName stopOrder routeId")
          .sort({ stopOrder: 1, stopName: 1 })
          .lean(),
        Employee.countDocuments({ routeId: { $in: routeIds } })
      ]);

      return {
        ...monitor,
        routeCount: routeIds.length,
        stopCount: stops.length,
        stops,
        employeeCount
      };
    })
  );

  res.json({ success: true, data: enriched });
});

export const getMonitorById = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.params.id).populate("assignedRoutes");
  if (!monitor) {
    throw new ApiError(404, "Monitor not found");
  }
  res.json({ success: true, data: monitor });
});

export const updateMonitor = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.params.id);
  if (!monitor) {
    throw new ApiError(404, "Monitor not found");
  }

  const previousRoutes = monitor.assignedRoutes.map(String);
  const nextRoutes = (req.body.assignedRoutes || []).map(String).slice(0, 1);

  if (req.body.assignedRoutes) {
    await ensureRouteAvailable(nextRoutes[0], monitor._id);
  }

  Object.assign(monitor, {
    fullName: req.body.fullName ?? monitor.fullName,
    userId: req.body.userId ?? monitor.userId,
    email: req.body.email ?? monitor.email,
    phone: req.body.phone ?? monitor.phone,
    assignedRoutes: req.body.assignedRoutes ? nextRoutes : monitor.assignedRoutes,
    status: req.body.status ?? monitor.status
  });

  await monitor.save();

  await Route.updateMany(
    { _id: { $in: previousRoutes.filter((id) => !nextRoutes.includes(id)) } },
    { $pull: { monitorIds: monitor._id } }
  );
  await Route.updateMany(
    { _id: { $in: nextRoutes } },
    { $addToSet: { monitorIds: monitor._id } }
  );

  res.json({ success: true, data: monitor });
});

export const deleteMonitor = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.params.id);
  if (!monitor) {
    throw new ApiError(404, "Monitor not found");
  }

  const assignedRouteIds = monitor.assignedRoutes.map(String);

  await Route.updateMany(
    { _id: { $in: assignedRouteIds } },
    { $pull: { monitorIds: monitor._id } }
  );

  await Monitor.findByIdAndDelete(monitor._id);

  res.json({ success: true, message: "Monitor deleted successfully" });
});
