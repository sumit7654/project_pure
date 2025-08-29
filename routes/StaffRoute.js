import express from "express";
import {
  registerStaffController,
  loginStaffController,
} from "../controller/UserController.js";

const router = express.Router();

router.post("/register", registerStaffController);
router.post("/login", loginStaffController);

export default router;
