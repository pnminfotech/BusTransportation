import { Employee } from "../models/Employee.js";
import { Monitor } from "../models/Monitor.js";
import { Route } from "../models/Route.js";
import { Stop } from "../models/Stop.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { shiftEmployeeAssignment } from "../services/employeeService.js";

function buildEmployeeQuery(query) {
  const filter = {};
  const search = query.search?.trim();

  if (search) {
    filter.$or = [
      { employeeCode: { $regex: search, $options: "i" } },
      { employeeName: { $regex: search, $options: "i" } },
      { contactNumber: { $regex: search, $options: "i" } },
      { officialEmail: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } }
    ];
  }

  ["companyName", "division", "employmentType", "routeId", "stopId", "status"].forEach((key) => {
    if (query[key]) {
      filter[key] = query[key];
    }
  });

  if (!query.status) {
    filter.status = "active";
  }

  return filter;
}

export const getEmployees = asyncHandler(async (req, res) => {
  const filter = buildEmployeeQuery(req.query);
  const employees = await Employee.find(filter)
    .populate("routeId", "routeCode routeName busNumber")
    .populate("stopId", "stopName stopOrder")
    .sort({ createdAt: -1 });
  res.json({ success: true, data: employees });
});

export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate("routeId", "routeCode routeName")
    .populate("stopId", "stopName stopOrder");
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }
  res.json({ success: true, data: employee });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }
  res.json({ success: true, data: employee });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }
  res.json({ success: true, message: "Employee deleted successfully" });
});

export const shiftEmployee = asyncHandler(async (req, res) => {
  const employee = await shiftEmployeeAssignment({
    employeeId: req.params.id,
    routeId: req.body.routeId,
    stopId: req.body.stopId,
    note: req.body.note || "Assignment updated",
    changedBy: { userId: req.user.id, role: req.user.role }
  });

  res.json({ success: true, data: employee });
});

export const getMonitorEmployees = asyncHandler(async (req, res) => {
  const monitor = await Monitor.findById(req.user.id).lean();
  const filter = buildEmployeeQuery(req.query);
  filter.routeId = { $in: monitor.assignedRoutes };

  const employees = await Employee.find(filter)
    .populate("routeId", "routeCode routeName")
    .populate("stopId", "stopName stopOrder")
    .sort({ employeeName: 1 });

  res.json({ success: true, data: employees });
});

export const updateEmployeeRemarks = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  const monitor = await Monitor.findById(req.user.id).lean();
  const assignedRouteIds = monitor.assignedRoutes.map(String);

  if (!assignedRouteIds.includes(String(employee.routeId))) {
    throw new ApiError(403, "You can only remark on employees in your assigned routes");
  }

  employee.remarks = req.body.remarks ?? employee.remarks;
  await employee.save();

  res.json({ success: true, data: employee });
});

export const approveMonitorEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  const monitor = await Monitor.findById(req.user.id).lean();
  const assignedRouteIds = monitor.assignedRoutes.map(String);
  let resolvedRouteId = employee.routeId ? String(employee.routeId) : "";

  if (!resolvedRouteId && employee.submittedRoute?.trim()) {
    const matchedRoute = await Route.findOne({
      _id: { $in: monitor.assignedRoutes },
      $or: [
        { busNumber: employee.submittedRoute.trim() },
        { routeCode: employee.submittedRoute.trim() },
        { routeName: employee.submittedRoute.trim() }
      ]
    }).lean();

    if (matchedRoute) {
      employee.routeId = matchedRoute._id;
      resolvedRouteId = String(matchedRoute._id);
    }
  }

  if (!resolvedRouteId || !assignedRouteIds.includes(resolvedRouteId)) {
    throw new ApiError(403, "This employee does not belong to your assigned route");
  }

  if (!employee.stopId && employee.submittedStop?.trim()) {
    const matchedStop = await Stop.findOne({
      routeId: employee.routeId,
      stopName: employee.submittedStop.trim()
    }).lean();

    if (matchedStop) {
      employee.stopId = matchedStop._id;
    }
  }

  if (employee.status === "active") {
    return res.json({ success: true, data: employee, message: "Employee is already approved" });
  }

  employee.status = "active";
  await employee.save();

  res.json({ success: true, data: employee, message: "Employee approved successfully" });
});
