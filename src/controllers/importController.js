import { parse } from "csv-parse/sync";
import { Employee } from "../models/Employee.js";
import { Route } from "../models/Route.js";
import { Stop } from "../models/Stop.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function normalizeImportRow(row) {
  return {
    companyName: row.companyName,
    division: row.division,
    employeeCode: row.employeeCode,
    employeeName: row.employeeName,
    residentAddress: row.residentAddress,
    contactNumber: row.contactNumber,
    officialEmail: row.officialEmail?.toLowerCase(),
    routeName: row.routeName,
    stopName: row.stopName,
    declarationAccepted:
      row.declarationAccepted === true ||
      row.declarationAccepted === "I Agree" ||
      row.declarationAccepted === "true",
    sourceType: row.sourceType || "google_form",
    status: row.status || "pending_verification",
    remarks: row.remarks || ""
  };
}

async function resolveRouteAndStop(routeName, stopName) {
  const route = await Route.findOne({
    $or: [{ routeName }, { routeCode: routeName }, { busNumber: routeName }]
  }).lean();
  const stop = route ? await Stop.findOne({ routeId: route._id, stopName }).lean() : null;
  return { route, stop };
}

export const importEmployees = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.records)
    ? req.body.records
    : parse(req.body.csv, { columns: true, skip_empty_lines: true });

  const results = { inserted: 0, skipped: 0, duplicates: [] };

  for (const rawRow of rows) {
    const row = normalizeImportRow(rawRow);
    const duplicate = await Employee.findOne({
      employeeCode: row.employeeCode,
      officialEmail: row.officialEmail
    }).lean();

    if (duplicate) {
      results.skipped += 1;
      results.duplicates.push({
        employeeCode: row.employeeCode,
        officialEmail: row.officialEmail
      });
      continue;
    }

    const { route, stop } = await resolveRouteAndStop(row.routeName, row.stopName);

    await Employee.create({
      companyName: row.companyName,
      division: row.division,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      residentAddress: row.residentAddress,
      contactNumber: row.contactNumber,
      officialEmail: row.officialEmail,
      submittedRoute: row.routeName || "",
      submittedStop: row.stopName || "",
      routeId: route?._id,
      stopId: stop?._id,
      declarationAccepted: row.declarationAccepted,
      sourceType: row.sourceType,
      status: row.status,
      remarks: row.remarks
    });

    results.inserted += 1;
  }

  res.status(201).json({ success: true, data: results });
});
