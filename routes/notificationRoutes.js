// routes/notificationRoutes.js

import express from "express";
import { getNotificationsController } from "../controllers/NotificationController.js";

const router = express.Router();

// Route: GET /api/notifications/user/:userId
router.get("/user/:userId", getNotificationsController);

export default router;
