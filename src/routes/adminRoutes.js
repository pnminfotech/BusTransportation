import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createMonitor,
  deleteMonitor,
  getMonitorById,
  getMonitors,
  updateMonitor
} from "../controllers/monitorController.js";
import { createRoute, deleteRoute, getRoutes, updateRoute } from "../controllers/routeController.js";
import { createStop, deleteStop, getStops, updateStop } from "../controllers/stopController.js";
import {
  deleteEmployee,
  getEmployeeById,
  getEmployees,
  shiftEmployee,
  updateEmployee
} from "../controllers/employeeController.js";
import { getAdminSummary } from "../controllers/dashboardController.js";
import { createRouteChangeRequest, getRequests, reviewRequest } from "../controllers/requestController.js";
import { importEmployees } from "../controllers/importController.js";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/dashboard/summary", getAdminSummary);

router.post("/monitors", createMonitor);
router.get("/monitors", getMonitors);
router.get("/monitors/:id", getMonitorById);
router.put("/monitors/:id", updateMonitor);
router.delete("/monitors/:id", deleteMonitor);

router.post("/routes", createRoute);
router.get("/routes", getRoutes);
router.put("/routes/:id", updateRoute);
router.delete("/routes/:id", deleteRoute);

router.post("/stops", createStop);
router.get("/stops", getStops);
router.put("/stops/:id", updateStop);
router.delete("/stops/:id", deleteStop);

router.get("/employees", getEmployees);
router.get("/employees/:id", getEmployeeById);
router.put("/employees/:id", updateEmployee);
router.delete("/employees/:id", deleteEmployee);
router.patch("/employees/:id/shift", shiftEmployee);

router.post("/requests", createRouteChangeRequest);
router.get("/requests", getRequests);
router.patch("/requests/:id/review", reviewRequest);

router.post("/imports/employees", importEmployees);

export default router;
