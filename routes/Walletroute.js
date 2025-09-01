import express from "express";
import {
  addMoneyController,
  getBalanceController,
} from "./../controller/Walletcontroller.js";

const router = express.Router();

router.post("/add-money/:phone_no", addMoneyController);
router.get("/balance/:phone_no", getBalanceController);

export default router;
