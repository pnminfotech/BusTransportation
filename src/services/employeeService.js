import { Employee } from "../models/Employee.js";
import { ApiError } from "../utils/ApiError.js";

export async function shiftEmployeeAssignment({
  employeeId,
  routeId,
  stopId,
  note,
  changedBy
}) {
  const employee = await Employee.findById(employeeId);

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  employee.assignmentHistory.push({
    fromRouteId: employee.routeId,
    toRouteId: routeId ?? employee.routeId,
    fromStopId: employee.stopId,
    toStopId: stopId ?? employee.stopId,
    note,
    changedBy
  });

  if (routeId) {
    employee.routeId = routeId;
  }

  if (stopId) {
    employee.stopId = stopId;
  }

  await employee.save();
  return employee;
}
