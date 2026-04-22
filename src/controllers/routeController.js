import { Route } from "../models/Route.js";
import { Employee } from "../models/Employee.js";
import { Monitor } from "../models/Monitor.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const createRoute = asyncHandler(async (req, res) => {
  const route = await Route.create(req.body);
  res.status(201).json({ success: true, data: route });
});

export const getRoutes = asyncHandler(async (_req, res) => {
  const routes = await Route.find()
    .populate("monitorIds", "fullName userId")
    .populate("stopIds", "stopName stopOrder")
    .sort({ routeCode: 1 })
    .lean();

  const enriched = await Promise.all(
    routes.map(async (route) => ({
      ...route,
      employeeCount: await Employee.countDocuments({ routeId: route._id })
    }))
  );

  res.json({ success: true, data: enriched });
});

export const updateRoute = asyncHandler(async (req, res) => {
  const route = await Route.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!route) {
    throw new ApiError(404, "Route not found");
  }
  res.json({ success: true, data: route });
});

export const updateMonitorRoute = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.user.id).lean();

  if (!monitor) {
    throw new ApiError(404, "Monitor not found");
  }

  const assignedRouteIds = monitor.assignedRoutes.map(String);

  if (!assignedRouteIds.includes(String(req.params.id))) {
    throw new ApiError(403, "You can only update your assigned routes");
  }

  const payload = {
    routeCode: req.body.routeCode,
    routeName: req.body.routeName,
    busNumber: req.body.busNumber
  };

  const route = await Route.findByIdAndUpdate(req.params.id, payload, { new: true });

  if (!route) {
    throw new ApiError(404, "Route not found");
  }

  res.json({ success: true, data: route });
});

export const deleteRoute = asyncHandler(async (req, res) => {
  const route = await Route.findByIdAndDelete(req.params.id);
  if (!route) {
    throw new ApiError(404, "Route not found");
  }
  res.json({ success: true, message: "Route deleted successfully" });
});
