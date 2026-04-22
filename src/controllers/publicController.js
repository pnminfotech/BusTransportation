import { Employee } from "../models/Employee.js";
import { Route } from "../models/Route.js";
import { Stop } from "../models/Stop.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const fallbackRoutes = [
  "MH 14 LS 0076 (Rajgurunagar)",
  "MH 14 LS 7600 (Kasarwadi)",
  "MH 14 LR 7601 (Kharadi)",
  "MH 14 LL 7602 (Hadapsar)",
  "MH 14 LL 7603 (Nigdi)",
  "MH 14 LL 7604 (Bajaj Material Gate)",
  "MH 14 LL 7605 (Katraj)",
  "MH 14 LR 7606 (Warje)",
  "MH 14 LL 7607 (Chinchwad)",
  "MH 14 LL 7608 (Rakshak Society)",
  "MH 14 LL 7609 (Park Street)",
  "MH 14 LR 7610 (Sus Road)",
  "MH 14 LS 7006 (Talegaon)"
];

const fallbackStops = [
  "Dange Chowk",
  "Birla Hospital",
  "Bijali Nagar",
  "Sambhaji Chowk",
  "Bhel Chowk",
  "LIC Chowk"
];

export const getPublicFormOptions = asyncHandler(async (_req, res) => {
  const [routes, stops] = await Promise.all([
    Route.find({ status: "active" })
      .populate("stopIds", "stopName stopOrder")
      .sort({ routeCode: 1 })
      .lean(),
    Stop.find({ status: "active" }).sort({ stopOrder: 1, stopName: 1 }).lean()
  ]);

  const routeOptions = routes.length
    ? routes.map((route) => ({
        label: route.busNumber ? `${route.busNumber} (${route.routeName})` : route.routeName,
        value: route.busNumber || route.routeCode || route.routeName,
        stops: (route.stopIds || [])
          .slice()
          .sort((first, second) => Number(first.stopOrder ?? 0) - Number(second.stopOrder ?? 0))
          .map((stop) => ({
            label: stop.stopName,
            value: stop.stopName
          }))
      }))
    : fallbackRoutes.map((route) => ({ label: route, value: route }));

  const stopOptions = stops.length
    ? [...new Map(stops.map((stop) => [stop.stopName, { label: stop.stopName, value: stop.stopName }])).values()]
    : fallbackStops.map((stop) => ({ label: stop, value: stop }));

  res.json({
    success: true,
    data: {
      companies: ["GIL", "DANA", "MATS", "AAPL"],
      divisions: ["Head Office", "Axle Plant", "Gear Plant"],
      employmentTypes: ["SOC", "Contract"],
      routes: routeOptions,
      stops: stopOptions
    }
  });
});

export const submitPublicEmployeeRegistration = asyncHandler(async (req, res) => {
  const {
    companyName,
    division,
    employmentType,
    employeeCode,
    employeeName,
    residentAddress,
    contactNumber,
    officialEmail,
    routeSelection,
    stopSelection,
    declaration
  } = req.body;

  const requiredFields = [
    ["companyName", companyName],
    ["division", division],
    ["employmentType", employmentType],
    ["employeeCode", employeeCode],
    ["employeeName", employeeName],
    ["residentAddress", residentAddress],
    ["contactNumber", contactNumber],
    ["officialEmail", officialEmail],
    ["routeSelection", routeSelection],
    ["stopSelection", stopSelection]
  ];

  const missingField = requiredFields.find(([, value]) => !String(value || "").trim());

  if (missingField) {
    throw new ApiError(400, `${missingField[0]} is required`);
  }

  if (!declaration) {
    throw new ApiError(400, "Declaration must be accepted before submitting the form");
  }

  const normalizedEmail = officialEmail?.trim().toLowerCase();
  const normalizedEmployeeCode = employeeCode?.trim();
  const normalizedContactNumber = String(contactNumber || "").trim();

  if (!/^\d{10}$/.test(normalizedContactNumber)) {
    throw new ApiError(400, "Contact number must be exactly 10 digits");
  }

  const duplicate = await Employee.findOne({
    employeeCode: normalizedEmployeeCode,
    officialEmail: normalizedEmail
  }).lean();

  if (duplicate) {
    throw new ApiError(409, "An employee with this employee code and official email already exists");
  }

  const route = await Route.findOne({
    $or: [
      { busNumber: routeSelection },
      { routeCode: routeSelection },
      { routeName: routeSelection }
    ]
  }).lean();

  const stop = route
    ? await Stop.findOne({ routeId: route._id, stopName: stopSelection }).lean()
    : await Stop.findOne({ stopName: stopSelection }).lean();

  if (!route) {
    throw new ApiError(400, "Selected bus number and route is invalid");
  }

  if (!stop) {
    throw new ApiError(400, "Selected stop is invalid for the chosen route");
  }

  const employee = await Employee.create({
    companyName,
    division,
    employmentType,
    employeeCode: normalizedEmployeeCode,
    employeeName,
    residentAddress,
    contactNumber: normalizedContactNumber,
    officialEmail: normalizedEmail,
    submittedRoute: routeSelection || "",
    submittedStop: stopSelection || "",
    routeId: route?._id,
    stopId: stop?._id,
    declarationAccepted: true,
    sourceType: "internal_form",
    status: "pending_verification"
  });

  res.status(201).json({
    success: true,
    message: "Registration submitted successfully",
    data: { id: employee._id }
  });
});
