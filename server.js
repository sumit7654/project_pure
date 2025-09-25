import dotenv from "dotenv";
dotenv.config();
import express from "express";
import connectDB from "./config/connectDB.js";
import cors from "cors";
import cron from "node-cron";
import Razorpay from "razorpay";
import { getTodayInKolkataString } from "./utils/dateHelper.js"; // ✅ Import the new helper
// Route Imports
import Userroutes from "./routes/Userroutes.js";
import Walletroute from "./routes/Walletroute.js";
import SubscriptionRoute from "./routes/SubscriptionRoute.js";
import staffRoutes from "./routes/StaffRoute.js"; // File ka naam 'staffRoute.js' maan rahe hain
import DeliveryModel from "./model/DeliveryModel.js"; // Naya model import karein
import deliveryRoutes from "./routes/deliveryRoutes.js"; // Naya route import karein
import pincodeRoutes from "./routes/pincodeRoutes.js"; // 💡 Naya route import karein
import routeRoutes from "./routes/routeRoutes.js"; // 💡 Naya route import karein
import productRoutes from "./routes/ProductRoutes.js"; // Import the new route
import categoryRoutes from "./routes/CategoryRoutes.js"; // ✅ 1. Import the new router
// Model Imports
import SubscriptionModel from "./model/SubscriptionModel.js";
import WalletModel from "./model/Walletmodel.js";

// 💡 FIX: Deduction service ko import karein
import { performDeduction } from "./services/deductionService.js";

// Database Connection
connectDB();

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
app.use("/api/routes", routeRoutes); // 💡 Naya route jodein
app.use("/api/pincodes", pincodeRoutes); // 💡 Naya route jodein
app.use("/api/deliveries", deliveryRoutes); // 💡 Naya route jodein
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes); // ✅ 2. Add this line
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }
    const options = {
      amount: Number(amount) * 100, // 💡 YEH SABSE ZAROORI HAI: Rupees ko Paisa mein badlein
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

// ✅ ADD THIS HEALTH CHECK ROUTE
app.get("/", (req, res) => {
  res.send("Server is healthy and running!");
});

// ==============================================================================
// ================================ CRON JOBS ===================================
// ==============================================================================
// Ye job har raat 11:59 PM par chalega
cron.schedule(
  "58 23 * * *",
  async () => {
    console.log("Running daily job to handle undelivered one-time orders...");
    try {
      const todayString = new Date().toISOString().split("T")[0];

      // Aaj ke saare "Pending" deliveries dhundhein
      const pendingDeliveries = await DeliveryModel.find({
        delivery_date: todayString,
        status: "Pending",
      })
        .populate("subscription")
        .populate("user");

      if (pendingDeliveries.length === 0) {
        console.log("No pending deliveries to process.");
        return;
      }

      for (const delivery of pendingDeliveries) {
        const subscription = delivery.subscription;

        // Sirf "one-time" (1 din ke) plans ko handle karein
        console.log(
          `Processing undelivered one-time order ${delivery._id} for user ${delivery.user.phone_no}`
        );

        // Step 1: Delivery ko "Cancelled" mark karein
        delivery.status = "Cancelled";

        // Step 2: Parent subscription ko "inactive" karein
        // subscription.is_active = false;

        // Step 3: Paise wallet mein waapas karein
        const wallet = await WalletModel.findOne({
          phone_no: delivery.user.phone_no,
        });
        if (wallet) {
          const refundAmount = subscription.plan.price_per_day;
          wallet.balance += refundAmount;

          // Ek credit transaction banayein
          await TransactionModel.create({
            walletId: wallet._id,
            amount: refundAmount,
            type: "credit",
            status: "successful",
            description: `Refund for undelivered one-time order #${delivery._id}`,
          });

          await wallet.save();
        }
        await delivery.save();
        // await subscription.save();
        console.log(
          `Order ${delivery._id} cancelled and ₹${subscription.plan.price_per_day} refunded.`
        );
      }
    } catch (error) {
      console.error("Error in handling undelivered orders cron job:", error);
    }
  },
  { timezone: "Asia/Kolkata" }
);
// CRON JOB 1: Har din subah 1 baje naye deliveries banayein
cron.schedule(
  "15 0 * * *",
  async () => {
    console.log("Running daily job to create deliveries...");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];

    const activeSubscriptions = await SubscriptionModel.find({
      is_active: true,
      validity_end_date: { $gte: today },
    });

    for (const sub of activeSubscriptions) {
      const pausedDateStrings = sub.paused_dates.map(
        (d) => new Date(d).toISOString().split("T")[0]
      );
      if (!pausedDateStrings.includes(todayString)) {
        // Check karein ki is din ke liye delivery pehle se to nahi bani hai
        const existingDelivery = await DeliveryModel.findOne({
          subscription: sub._id,
          delivery_date: todayString,
        });
        if (!existingDelivery) {
          await DeliveryModel.create({
            subscription: sub._id,
            user: sub.user,
            delivery_date: todayString,
            status: "Pending",
          });
        }
      }
    }
    console.log("Daily delivery creation job finished.");
  },
  { timezone: "Asia/Kolkata" }
);
// CRON JOB 1: Har din subah 1 baje wallet se paise kaatne ke liye
cron.schedule(
  "2 1 * * *",
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
        const todayString = getTodayInKolkataString(); // ✅ Use timezone-safe date
        const lastDeduction = sub.last_deduction_date
          ? new Date(sub.last_deduction_date)
          : null;
        if (lastDeduction && lastDeduction.getTime() >= today.getTime()) {
          console.log(`Skipping ${sub.phone_no}: Already deducted today.`);
          continue;
        }
        const pausedDateStrings = sub.paused_dates.map(
          (d) => new Date(d).toISOString().split("T")[0]
        );
        if (pausedDateStrings.includes(todayString)) {
          console.log(`Skipping ${sub.phone_no}: Delivery is paused today.`);
          continue;
        }

        // 💡 FIX: Ab hum yahaan seedhe service ko call karenge
        await performDeduction(sub);
      }
    } catch (error) {
      console.error("Error in daily deduction cron job:", error);
    }
    console.log("Daily deduction cron job finished.");
  },
  { timezone: "Asia/Kolkata" }
);

// 💡 FIX: Expired subscriptions ke liye ALAG cron job
// Ye job har din subah 1:05 baje chalega
cron.schedule(
  "0 23 * * *",
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
