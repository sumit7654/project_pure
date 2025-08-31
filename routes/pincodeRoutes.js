// routes/pincodeRoutes.js

import express from "express";
import { checkServiceabilityController } from "../controller/PincodeController.js";

const router = express.Router();

// GET /api/pincodes/check-serviceability/:pincode
router.get("/check-serviceability/:pincode", checkServiceabilityController);

export default router;
