import { Stop } from "../models/Stop.js";
import { Route } from "../models/Route.js";
import { Monitor } from "../models/Monitor.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

async function assertUniqueStopOrder(routeId, stopOrder, excludeStopId = null) {
  const normalizedStopOrder = Number(stopOrder);

  if (!routeId) {
    throw new ApiError(400, "routeId is required");
  }

  if (!normalizedStopOrder || normalizedStopOrder < 1) {
    throw new ApiError(400, "Stop order must be 1 or greater");
  }

  const existingStop = await Stop.findOne({
    routeId,
    stopOrder: normalizedStopOrder,
    ...(excludeStopId ? { _id: { $ne: excludeStopId } } : {})
  }).lean();

  if (existingStop) {
    throw new ApiError(409, `Stop order ${normalizedStopOrder} already exists for this route`);
  }

  return normalizedStopOrder;
}

export const createStop = asyncHandler(async (req, res) => {
  const normalizedStopOrder = await assertUniqueStopOrder(req.body.routeId, req.body.stopOrder);
  const stop = await Stop.create({
    ...req.body,
    stopOrder: normalizedStopOrder
  });
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

  const normalizedStopOrder = await assertUniqueStopOrder(req.body.routeId, req.body.stopOrder);
  const stop = await Stop.create({
    ...req.body,
    stopOrder: normalizedStopOrder
  });
  await Route.findByIdAndUpdate(stop.routeId, { $addToSet: { stopIds: stop._id } });

  res.status(201).json({ success: true, data: stop });
});

export const getStops = asyncHandler(async (req, res) => {
  const query = req.query.routeId ? { routeId: req.query.routeId } : {};
  const stops = await Stop.find(query).populate("routeId", "routeCode routeName").sort({ stopOrder: 1 });
  res.json({ success: true, data: stops });
});

export const updateStop = asyncHandler(async (req, res) => {
  const stop = await Stop.findById(req.params.id);
  if (!stop) {
    throw new ApiError(404, "Stop not found");
  }

  const nextRouteId = req.body.routeId ?? stop.routeId;
  const nextStopOrder = req.body.stopOrder ?? stop.stopOrder;
  const normalizedStopOrder = await assertUniqueStopOrder(nextRouteId, nextStopOrder, stop._id);

  Object.assign(stop, {
    stopName: req.body.stopName ?? stop.stopName,
    stopOrder: normalizedStopOrder,
    status: req.body.status ?? stop.status,
    routeId: nextRouteId
  });

  await stop.save();

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
    stopOrder: await assertUniqueStopOrder(
      req.body.routeId ?? stop.routeId,
      req.body.stopOrder ?? stop.stopOrder,
      stop._id
    ),
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
