import { Router } from "express";
import { adminLogin, monitorLogin, changeMonitorPassword } from "../controllers/authController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.post("/admin/login", adminLogin);
router.post("/monitor/login", monitorLogin);
router.post("/monitor/change-password", authenticate, authorize("monitor"), changeMonitorPassword);

export default router;
