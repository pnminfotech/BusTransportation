import { Router } from "express";
import {
  getPublicFormOptions,
  submitPublicEmployeeRegistration
} from "../controllers/publicController.js";

const router = Router();

router.get("/employee-registration/options", getPublicFormOptions);
router.post("/employee-registration", submitPublicEmployeeRegistration);

export default router;
