import { Employee } from "../models/Employee.js";
import { Route } from "../models/Route.js";
import { Stop } from "../models/Stop.js";
import { Monitor } from "../models/Monitor.js";
import { RouteChangeRequest } from "../models/RouteChangeRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAdminSummary = asyncHandler(async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalEmployees,
    totalRoutes,
    totalStops,
    totalMonitors,
    pendingEmployeeRequests,
    routeChangeRequests,
    employeesShiftedRecently
  ] = await Promise.all([
    Employee.countDocuments(),
    Route.countDocuments(),
    Stop.countDocuments(),
    Monitor.countDocuments(),
    Employee.countDocuments({ status: "pending_verification" }),
    RouteChangeRequest.countDocuments({ status: "pending" }),
    Employee.countDocuments({ "assignmentHistory.changedAt": { $gte: sevenDaysAgo } })
  ]);

  res.json({
    success: true,
    data: {
      totalEmployees,
      totalRoutes,
      totalStops,
      totalMonitors,
      pendingEmployeeRequests,
      routeChangeRequests,
      employeesShiftedRecently
    }
  });
});

export const getMonitorSummary = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.user.id).populate("assignedRoutes", "routeCode routeName").lean();
  const routeIds = monitor.assignedRoutes.map((route) => route._id);

  const [totalStops, totalEmployees, pendingApprovals, stopWiseCounts] = await Promise.all([
    Stop.countDocuments({ routeId: { $in: routeIds } }),
    Employee.countDocuments({ routeId: { $in: routeIds }, status: "active" }),
    Employee.countDocuments({ routeId: { $in: routeIds }, status: "pending_verification" }),
    Employee.aggregate([
      { $match: { routeId: { $in: routeIds }, status: "active" } },
      { $group: { _id: "$stopId", count: { $sum: 1 } } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      assignedRoutes: monitor.assignedRoutes,
      totalStops,
      totalEmployees,
      pendingApprovals,
      stopWiseCounts
    }
  });
});
