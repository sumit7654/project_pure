import express from "express";
import {
  registerStaffController,
  loginStaffController,
  getDashboardStatsController,
  getTodaysDeliveriesController,
} from "../controller/UserController.js";

const router = express.Router();

router.post("/register", registerStaffController);
router.post("/login", loginStaffController);
router.get("/dashboard-stats", getDashboardStatsController);
router.get("/todays-deliveries", getTodaysDeliveriesController);

export default router;
