import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { getMonitorSummary } from "../controllers/dashboardController.js";
import { createMonitorStop, deleteMonitorStop, updateMonitorStop } from "../controllers/stopController.js";
import { updateMonitorRoute } from "../controllers/routeController.js";
import {
  getMonitorEmployees,
  updateEmployeeRemarks,
  approveMonitorEmployee,
  shiftMonitorEmployee
} from "../controllers/employeeController.js";
import { createRouteChangeRequest, getRequests } from "../controllers/requestController.js";
import { Monitor } from "../models/Monitor.js";
import { Stop } from "../models/Stop.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate, authorize("monitor"));

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const monitor = await Monitor.findById(req.user.id).populate("assignedRoutes", "routeCode routeName busNumber");
    res.json({ success: true, data: monitor });
  })
);

router.get(
  "/routes",
  asyncHandler(async (req, res) => {
    const monitor = await Monitor.findById(req.user.id).populate("assignedRoutes", "routeCode routeName busNumber");
    res.json({ success: true, data: monitor.assignedRoutes });
  })
);

router.get(
  "/stops",
  asyncHandler(async (req, res) => {
    const monitor = await Monitor.findById(req.user.id).lean();
    const stops = await Stop.find({ routeId: { $in: monitor.assignedRoutes } })
      .populate("routeId", "routeCode routeName")
      .sort({ routeId: 1, stopOrder: 1 });
    res.json({ success: true, data: stops });
  })
);
router.post("/stops", createMonitorStop);
router.put("/stops/:id", updateMonitorStop);
router.delete("/stops/:id", deleteMonitorStop);
router.put("/routes/:id", updateMonitorRoute);

router.get("/summary", getMonitorSummary);
router.get("/employees", getMonitorEmployees);
router.patch("/employees/:id/remarks", updateEmployeeRemarks);
router.patch("/employees/:id/approve", approveMonitorEmployee);
router.patch("/employees/:id/shift", shiftMonitorEmployee);
router.post("/requests", createRouteChangeRequest);
router.get("/requests", getRequests);

export default router;
