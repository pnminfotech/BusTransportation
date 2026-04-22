import { RouteChangeRequest } from "../models/RouteChangeRequest.js";
import { Employee } from "../models/Employee.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { shiftEmployeeAssignment } from "../services/employeeService.js";

export const createRouteChangeRequest = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.body.employeeId);
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  const request = await RouteChangeRequest.create({
    employeeId: employee._id,
    currentRouteId: employee.routeId,
    requestedRouteId: req.body.requestedRouteId,
    currentStopId: employee.stopId,
    requestedStopId: req.body.requestedStopId,
    reason: req.body.reason,
    requestedBy: req.user.id,
    requestRole: req.user.role
  });

  res.status(201).json({ success: true, data: request });
});

export const getRequests = asyncHandler(async (req, res) => {
  const query = req.user.role === "monitor" ? { requestedBy: req.user.id } : {};
  if (req.query.status) {
    query.status = req.query.status;
  }

  const requests = await RouteChangeRequest.find(query)
    .populate("employeeId", "employeeCode employeeName")
    .populate("currentRouteId requestedRouteId", "routeCode routeName")
    .populate("currentStopId requestedStopId", "stopName")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: requests });
});

export const reviewRequest = asyncHandler(async (req, res) => {
  const request = await RouteChangeRequest.findById(req.params.id);
  if (!request) {
    throw new ApiError(404, "Request not found");
  }

  request.status = req.body.status;
  request.adminRemark = req.body.adminRemark || "";
  await request.save();

  if (req.body.status === "approved") {
    await shiftEmployeeAssignment({
      employeeId: request.employeeId,
      routeId: request.requestedRouteId,
      stopId: request.requestedStopId,
      note: "Approved route change request",
      changedBy: { userId: req.user.id, role: req.user.role }
    });
  }

  res.json({ success: true, data: request });
});
