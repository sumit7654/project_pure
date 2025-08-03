import {
  Registercontroller,
  Logincontroller,
} from "../controller/UserController.js";
import express from "express";

const router = express.Router();

router.post("/registeruser", Registercontroller);
router.post("/loginuser", Logincontroller);

export default router;
