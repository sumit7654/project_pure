import express from "express";
import {
  Registercontroller,
  Logincontroller,
  UpdateLocationController,
  applyReferralCodeController,
} from "../controller/UserController.js";
// savePushTokenController, // Naya controller import karein

const router = express.Router();

// Purane routes
router.post("/registeruser", Registercontroller);
router.post("/loginuser", Logincontroller);
router.post("/apply-referral/:userId", applyReferralCodeController);
// router.post("/save-push-token", savePushTokenController);
// +++ Naya Route: Location save aur update karne ke liye +++
// Ye route 'PUT' method ka istemal karta hai, jo update ke liye standard hai.
// ':userId' ka matlab hai ki URL mein jo bhi aayega, wo 'userId' variable ban jaayega.
router.put("/update-location/:userId", UpdateLocationController);

export default router;
