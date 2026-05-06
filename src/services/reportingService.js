import { Employee } from "../models/Employee.js";
import { Company } from "../models/Company.js";

function normalizeMonth(input) {
  if (!input) {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const match = String(input).match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error("Month must be in YYYY-MM format");
  }

  return `${match[1]}-${match[2]}`;
}

export function getPreviousMonth(monthValue = null) {
  const base = monthValue ? new Date(`${monthValue}-01T00:00:00.000Z`) : new Date();
  const previous = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - 1, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
}

function uniqueEmails(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function syncCompaniesFromEmployees() {
  const names = await Employee.distinct("companyName", {
    companyName: { $exists: true, $ne: "" }
  });

  const cleanNames = names
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  await Promise.all(
    cleanNames.map((name) =>
      Company.updateOne(
        { name },
        { $setOnInsert: { name, reportEmails: [], ccEmails: [], isActive: true } },
        { upsert: true }
      )
    )
  );

  return Company.find().sort({ name: 1 });
}

export async function getCompanyConfigurations() {
  await syncCompaniesFromEmployees();
  return Company.find().sort({ name: 1 }).lean();
}

export async function upsertCompanyConfiguration(id, payload) {
  const company = await Company.findById(id);
  if (!company) {
    throw new Error("Company configuration not found");
  }

  if (payload.name !== undefined) {
    company.name = String(payload.name || "").trim() || company.name;
  }

  if (payload.code !== undefined) {
    company.code = String(payload.code || "").trim();
  }

  if (payload.reportEmails !== undefined) {
    company.reportEmails = uniqueEmails(payload.reportEmails);
  }

  if (payload.ccEmails !== undefined) {
    company.ccEmails = uniqueEmails(payload.ccEmails);
  }

  if (payload.isActive !== undefined) {
    company.isActive = Boolean(payload.isActive);
  }

  await company.save();
  return company.toObject();
}

export async function buildMonthlyTransportReport({ month, companyName }) {
  const reportMonth = normalizeMonth(month);
  const filter = { status: "active" };

  if (companyName?.trim()) {
    filter.companyName = companyName.trim();
  }

  const employees = await Employee.find(filter)
    .populate("routeId", "routeCode routeName busNumber")
    .populate("stopId", "stopName")
    .sort({ companyName: 1, division: 1, employeeName: 1 })
    .lean();

  const detailRows = employees.map((employee) => ({
    employeeCode: employee.employeeCode || "-",
    employeeName: employee.employeeName || "-",
    companyName: employee.companyName || "Unassigned Company",
    plantName: employee.division || "Unassigned Plant",
    routeOrPickupPoint:
      employee.stopId?.stopName ||
      employee.submittedStop ||
      employee.routeId?.routeCode ||
      employee.routeId?.routeName ||
      employee.submittedRoute ||
      "-"
  }));

  const companyMap = new Map();

  detailRows.forEach((row) => {
    if (!companyMap.has(row.companyName)) {
      companyMap.set(row.companyName, {
        companyName: row.companyName,
        employeeCount: 0,
        plants: new Map(),
        employees: []
      });
    }

    const companyBucket = companyMap.get(row.companyName);
    companyBucket.employeeCount += 1;
    companyBucket.employees.push(row);
    companyBucket.plants.set(row.plantName, (companyBucket.plants.get(row.plantName) || 0) + 1);
  });

  const companies = Array.from(companyMap.values()).map((companyBucket) => ({
    companyName: companyBucket.companyName,
    employeeCount: companyBucket.employeeCount,
    plants: Array.from(companyBucket.plants.entries())
      .map(([plantName, employeeCount]) => ({ plantName, employeeCount }))
      .sort((left, right) => left.plantName.localeCompare(right.plantName)),
    employees: companyBucket.employees
  }));

  const summary = companies.map(({ companyName: name, employeeCount, plants }) => ({
    companyName: name,
    employeeCount,
    plants
  }));

  const companiesConfig = await getCompanyConfigurations();
  const configByName = new Map(companiesConfig.map((company) => [company.name, company]));

  return {
    reportMonth,
    generatedAt: new Date().toISOString(),
    filterCompanyName: companyName?.trim() || "",
    totalEmployees: detailRows.length,
    summary,
    groupedCompanies: companies.map((company) => ({
      ...company,
      reportEmails: configByName.get(company.companyName)?.reportEmails || [],
      ccEmails: configByName.get(company.companyName)?.ccEmails || []
    })),
    employees: detailRows,
    availableCompanies: companiesConfig.map((company) => company.name)
  };
}

export function buildCsvReport(report) {
  const lines = [
    ["Monthly Employee Bus Transportation Report"],
    ["Report Month", report.reportMonth],
    ["Generated At", report.generatedAt],
    [""],
    ["Summary"],
    ["Company", "Plant", "Employee Count"]
  ];

  report.summary.forEach((company) => {
    company.plants.forEach((plant) => {
      lines.push([company.companyName, plant.plantName, String(plant.employeeCount)]);
    });
  });

  lines.push([""]);
  lines.push(["Total Employees", String(report.totalEmployees)]);
  lines.push([""]);
  lines.push(["Details"]);
  lines.push(["Employee Code", "Employee Name", "Company Name", "Plant Name", "Route / Pickup Point"]);

  report.employees.forEach((employee) => {
    lines.push([
      employee.employeeCode,
      employee.employeeName,
      employee.companyName,
      employee.plantName,
      employee.routeOrPickupPoint
    ]);
  });

  return lines
    .map((line) => line.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function buildReportFileName(reportMonth, format = "csv", companyName = "") {
  const scope = companyName ? companyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") : "all-companies";
  return `transport-report-${reportMonth}-${scope}.${format}`;
}
