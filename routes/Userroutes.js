import {
  Registercontroller,
  Logincontroller,
  UpdateLocationController, // 👈 नया कंट्रोलर इम्पोर्ट करें
} from "./../controller/UserController.js";
import express from "express";

const router = express.Router();

router.post("/registeruser", Registercontroller);
router.post("/loginuser", Logincontroller);

// +++ नया लोकेशन अपडेट रूट +++
router.put("/update-location/:userId", UpdateLocationController);

export default router;
