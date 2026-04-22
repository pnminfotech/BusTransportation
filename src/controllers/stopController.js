import { Stop } from "../models/Stop.js";
import { Route } from "../models/Route.js";
import { Monitor } from "../models/Monitor.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const createStop = asyncHandler(async (req, res) => {
  const stop = await Stop.create(req.body);
  await Route.findByIdAndUpdate(stop.routeId, { $addToSet: { stopIds: stop._id } });
  res.status(201).json({ success: true, data: stop });
});

export const createMonitorStop = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.user.id).lean();

  if (!monitor) {
    throw new ApiError(404, "Monitor not found");
  }

  const assignedRouteIds = monitor.assignedRoutes.map(String);

  if (!assignedRouteIds.includes(String(req.body.routeId))) {
    throw new ApiError(403, "You can only create stops for your assigned routes");
  }

  const stop = await Stop.create(req.body);
  await Route.findByIdAndUpdate(stop.routeId, { $addToSet: { stopIds: stop._id } });

  res.status(201).json({ success: true, data: stop });
});

export const getStops = asyncHandler(async (req, res) => {
  const query = req.query.routeId ? { routeId: req.query.routeId } : {};
  const stops = await Stop.find(query).populate("routeId", "routeCode routeName").sort({ stopOrder: 1 });
  res.json({ success: true, data: stops });
});

export const updateStop = asyncHandler(async (req, res) => {
  const stop = await Stop.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!stop) {
    throw new ApiError(404, "Stop not found");
  }
  res.json({ success: true, data: stop });
});

export const updateMonitorStop = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.user.id).lean();

  if (!monitor) {
    throw new ApiError(404, "Monitor not found");
  }

  const stop = await Stop.findById(req.params.id);

  if (!stop) {
    throw new ApiError(404, "Stop not found");
  }

  const assignedRouteIds = monitor.assignedRoutes.map(String);

  if (!assignedRouteIds.includes(String(stop.routeId))) {
    throw new ApiError(403, "You can only update stops for your assigned routes");
  }

  Object.assign(stop, {
    stopName: req.body.stopName ?? stop.stopName,
    stopOrder: req.body.stopOrder ?? stop.stopOrder,
    status: req.body.status ?? stop.status,
    routeId: req.body.routeId ?? stop.routeId
  });

  await stop.save();

  res.json({ success: true, data: stop });
});

export const deleteStop = asyncHandler(async (req, res) => {
  const stop = await Stop.findByIdAndDelete(req.params.id);
  if (!stop) {
    throw new ApiError(404, "Stop not found");
  }
  await Route.findByIdAndUpdate(stop.routeId, { $pull: { stopIds: stop._id } });
  res.json({ success: true, message: "Stop deleted successfully" });
});

export const deleteMonitorStop = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.user.id).lean();

  if (!monitor) {
    throw new ApiError(404, "Monitor not found");
  }

  const stop = await Stop.findById(req.params.id);

  if (!stop) {
    throw new ApiError(404, "Stop not found");
  }

  const assignedRouteIds = monitor.assignedRoutes.map(String);

  if (!assignedRouteIds.includes(String(stop.routeId))) {
    throw new ApiError(403, "You can only delete stops for your assigned routes");
  }

  await Stop.findByIdAndDelete(req.params.id);
  await Route.findByIdAndUpdate(stop.routeId, { $pull: { stopIds: stop._id } });

  res.json({ success: true, message: "Stop deleted successfully" });
});
