// 💡 dotenv ko sabse pehle call karein taaki MONGO_URI hamesha available rahe
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import connectDB from "./config/connectDB.js";
import cors from "cors";
import cron from "node-cron";
import Razorpay from "razorpay";

// Route Imports
import Userroutes from "./routes/Userroutes.js";
import Walletroute from "./routes/Walletroute.js";
import SubscriptionRoute from "./routes/SubscriptionRoute.js";
import staffRoutes from "./routes/staffRoutes.js"; // Sunishchit karein ki aapki file ka naam 'staffRoutes.js' hai

// Model Imports
import SubscriptionModel from "./model/SubscriptionModel.js";
import WalletModel from "./model/Walletmodel.js";
import TransactionModel from "./model/TransactionModel.js";

// Database Connection
connectDB();

// Razorpay Instance
const instance = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3541;

// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", Userroutes);
app.use("/api/v1/wallet", Walletroute);
app.use("/api/subscriptions", SubscriptionRoute);
app.use("/api/staff", staffRoutes);

// Standalone Razorpay Order Creation Route
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }
    const options = {
      amount: Number(amount) * 100, // Amount in paisa
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`,
    };
    const order = await instance.orders.create(options);
    if (!order) {
      return res.status(500).json({ error: "Order creation failed" });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==============================================================================
// ================================ CRON JOBS ===================================
// ==============================================================================

// CRON JOB 1: Har din subah 1 baje wallet se paise kaatne ke liye
cron.schedule(
  "0 1 * * *",
  async () => {
    console.log("Running daily deduction cron job...");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const activeSubscriptions = await SubscriptionModel.find({
        is_active: true,
        validity_end_date: { $gte: today },
      });

      for (const sub of activeSubscriptions) {
        // ... (Aapka poora deduction logic yahaan) ...
      }
    } catch (error) {
      console.error("Error in daily deduction cron job:", error);
    }
    console.log("Daily deduction cron job finished.");
  },
  { timezone: "Asia/Kolkata" }
);

// CRON JOB 2: Har din subah 1:05 baje expired subscriptions ko deactivate karne ke liye
cron.schedule(
  "5 1 * * *",
  async () => {
    console.log("Running daily job to deactivate expired subscriptions...");
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result = await SubscriptionModel.updateMany(
        { is_active: true, validity_end_date: { $lt: today } },
        { $set: { is_active: false } }
      );
      if (result.modifiedCount > 0) {
        console.log(
          `Successfully deactivated ${result.modifiedCount} expired subscriptions.`
        );
      } else {
        console.log("No subscriptions to deactivate today.");
      }
    } catch (error) {
      console.error(
        "Error in deactivating expired subscriptions cron job:",
        error
      );
    }
  },
  { timezone: "Asia/Kolkata" }
);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
