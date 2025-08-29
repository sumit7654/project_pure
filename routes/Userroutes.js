import express from "express";
import {
  Registercontroller,
  Logincontroller,
  UpdateLocationController, // Naya controller import karein
} from "../controller/UserController.js";

const router = express.Router();

// Purane routes
router.post("/registeruser", Registercontroller);
router.post("/loginuser", Logincontroller);

// +++ Naya Route: Location save aur update karne ke liye +++
// Ye route 'PUT' method ka istemal karta hai, jo update ke liye standard hai.
// ':userId' ka matlab hai ki URL mein jo bhi aayega, wo 'userId' variable ban jaayega.
router.put("/update-location/:userId", UpdateLocationController);

export default router;
