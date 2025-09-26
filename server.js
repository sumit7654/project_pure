import dotenv from "dotenv";
dotenv.config();
import express from "express";
import connectDB from "./config/connectDB.js";
import cors from "cors";
import cron from "node-cron";
import Razorpay from "razorpay";

// Helper for timezone-safe dates
import { getTodayInKolkataString } from "./utils/dateHelper.js";

// Route Imports
import Userroutes from "./routes/Userroutes.js";
import Walletroute from "./routes/Walletroute.js";
import SubscriptionRoute from "./routes/SubscriptionRoute.js";
import staffRoutes from "./routes/StaffRoute.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import pincodeRoutes from "./routes/pincodeRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import productRoutes from "./routes/ProductRoutes.js";
import categoryRoutes from "./routes/CategoryRoutes.js";

// Model Imports
import SubscriptionModel from "./model/SubscriptionModel.js";

// Service Imports
import { performDeduction } from "./services/deductionService.js";

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
app.use("/api/routes", routeRoutes);
app.use("/api/pincodes", pincodeRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);

// Razorpay Order Creation Route
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }
    const options = {
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`,
    };
    const order = await instance.orders.create(options);
    if (!order) {
      return res.status(500).json({ error: "Order creation failed" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error in /create-order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health Check Route for Render and UptimeRobot
app.get("/", (req, res) => {
  res.send("Server is healthy and running!");
});

// ==============================================================================
// ========================== THE ONLY CRON JOB YOU NEED ========================
// ==============================================================================

// This single, smart job runs every day at 1:05 AM IST
cron.schedule(
  "5 0 * * *",
  async () => {
    console.log("--- Starting Daily Subscription Processing Job ---");
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = getTodayInKolkataString();

      // Step 1: Deactivate any subscriptions that have already expired.
      // This is a cleanup step to ensure we don't process old plans.
      const deactivationResult = await SubscriptionModel.updateMany(
        { is_active: true, validity_end_date: { $lt: today } },
        { $set: { is_active: false } }
      );
      if (deactivationResult.modifiedCount > 0) {
        console.log(
          `Deactivated ${deactivationResult.modifiedCount} expired subscriptions.`
        );
      }

      // Step 2: Find all subscriptions that are eligible for a delivery today.
      const subscriptionsToProcess = await SubscriptionModel.find({
        is_active: true, // Must be active
        start_date: { $lte: new Date() }, // Must have a start date of today or in the past
        validity_end_date: { $gte: today }, // Must not be expired yet
        paused_dates: { $nin: [todayString] }, // And must not be paused for today
      }).populate("user"); // We need user data for sending push notifications on failure

      console.log(
        `Found ${subscriptionsToProcess.length} subscriptions to process for ${todayString}.`
      );

      // Step 3: Process each eligible subscription one by one.
      for (const sub of subscriptionsToProcess) {
        // This service now handles EVERYTHING:
        // 1. Checks wallet balance.
        // 2. Deducts money if the balance is sufficient.
        // 3. Creates a delivery record ONLY IF the deduction succeeds.
        // 4. Pauses the subscription and notifies the user if the balance is low.
        await performDeduction(sub);
      }
    } catch (error) {
      console.error(
        "CRITICAL ERROR in daily subscription processing job:",
        error
      );
    }
    console.log("--- Daily Subscription Processing Job Finished ---");
  },
  { timezone: "Asia/Kolkata" }
);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
