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
import mongoose from "mongoose";

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
app.use("/api/routes", routeRoutes);
app.use("/api/pincodes", pincodeRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
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
// ========================== THE ONLY CRON JOB YOU NEED ========================
// ==============================================================================

// ✅ Yeh akela, smart job har din subah 1:05 AM baje chalega
// cron.schedule(
//   "1 0 * * *",
//   async () => {
//     console.log("--- Starting Daily Subscription Processing Job ---");
//     try {
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
//       const todayString = getTodayInKolkataString();

//       // Step 1: Sabse pehle, un sabhi subscriptions ko deactivate karein jo pehle hi expire ho chuke hain.
//       // Yeh ek zaroori safai ka kadam hai.
//       const deactivationResult = await SubscriptionModel.updateMany(
//         { is_active: true, validity_end_date: { $lt: today } },
//         { $set: { is_active: false } }
//       );
//       if (deactivationResult.modifiedCount > 0) {
//         console.log(
//           `Deactivated ${deactivationResult.modifiedCount} expired subscriptions.`
//         );
//       }

//       // Step 2: Ab, un sabhi subscriptions ko dhoondhein jinki delivery aaj honi chahiye.
//       const subscriptionsToProcess = await SubscriptionModel.find({
//         is_active: true, // Active hona chahiye
//         start_date: { $lte: new Date() }, // Start date aaj ya usse pehle ki honi chahiye
//         validity_end_date: { $gte: today }, // Abhi tak expire na hua ho
//         paused_dates: { $nin: [todayString] }, // Aur aaj ke liye paused na ho
//       }).populate("user"); // Humein push notifications ke liye user data chahiye

//       console.log(
//         `Found ${subscriptionsToProcess.length} subscriptions to process for ${todayString}.`
//       );

//       // Step 3: Har ek subscription ko process karein.
//       for (const sub of subscriptionsToProcess) {
//         // Yeh service ab sab kuch handle karegi:
//         // 1. Wallet balance check karna.
//         // 2. Balance hone par paise kaatna.
//         // 3. Sirf paise kaatne ke BAAD hi delivery record banana.
//         // 4. Kam balance hone par subscription ko pause karna.
//         await performDeduction(sub);
//       }
//     } catch (error) {
//       console.error(
//         "CRITICAL ERROR in daily subscription processing job:",
//         error
//       );
//     }
//     console.log("--- Daily Subscription Processing Job Finished ---");
//   },
//   { timezone: "Asia/Kolkata" }
// );

// ==============================================================================
// ========================== THE ONLY CRON JOB YOU NEED ========================
// ==============================================================================

// Yeh akela, smart job har din subah 1:05 AM IST par chalega
cron.schedule(
  "47 8 * * *",
  async () => {
    console.log("--- Starting Daily Subscription Processing Job ---");
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = getTodayInKolkataString();

      // Step 1: Sabse pehle, un sabhi subscriptions ko deactivate karein jo pehle hi expire ho chuke hain.
      const deactivationResult = await SubscriptionModel.updateMany(
        { is_active: true, validity_end_date: { $lt: today } },
        { $set: { is_active: false } }
      );
      if (deactivationResult.modifiedCount > 0) {
        console.log(
          `Deactivated ${deactivationResult.modifiedCount} expired subscriptions.`
        );
      }

      // Step 2: Ab, un sabhi subscriptions ko dhoondhein jinki delivery aaj honi chahiye.
      const subscriptionsToProcess = await SubscriptionModel.find({
        is_active: true,
        start_date: { $lte: new Date() }, // Start date aaj ya usse pehle ki honi chahiye
        $or: [
          { validity_end_date: null }, // Hamesha chalne wale plans
          { validity_end_date: { $gte: today } }, // Fixed-term plans
        ], // Abhi tak expire na hua ho
        paused_dates: { $nin: [todayString] }, // Aur aaj ke liye paused na ho
      }).populate("user", "walletId");

      // console.log("Subscription TO Process", subscriptionsToProcess);

      console.log(
        `Found ${subscriptionsToProcess.length} subscriptions to process for ${todayString}.`
      );

      // Step 3: Har ek subscription ko process karein.
      for (const sub of subscriptionsToProcess) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          await performDeduction(sub, session);
          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
        } finally {
          session.endSession();
        }
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

// Puraane, conflicting cron jobs hata diye gaye hain.

// ############################### ------------------------ #######################
// Raat 11:50 wala "undelivered orders" ka job hata diya gaya hai.
// Sabhi pending orders ko automatically refund karna ek khatarnak business logic hai.
// Yeh kaam admin ko manually karna chahiye.

// ==============================================================================
// ================================ CRON JOBS ===================================
// ==============================================================================
// Ye job har raat 11:59 PM par chalega
// cron.schedule(
//   "50 23 * * *",
//   async () => {
//     console.log("Running daily job to handle undelivered one-time orders...");
//     try {
//       const todayString = new Date().toISOString().split("T")[0];

//       // Aaj ke saare "Pending" deliveries dhundhein
//       const pendingDeliveries = await DeliveryModel.find({
//         delivery_date: todayString,
//         status: "Pending",
//       })
//         .populate("subscription")
//         .populate("user");

//       if (pendingDeliveries.length === 0) {
//         console.log("No pending deliveries to process.");
//         return;
//       }

//       for (const delivery of pendingDeliveries) {
//         const subscription = delivery.subscription;

//         // Sirf "one-time" (1 din ke) plans ko handle karein
//         console.log(
//           `Processing undelivered one-time order ${delivery._id} for user ${delivery.user.phone_no}`
//         );

//         // Step 1: Delivery ko "Cancelled" mark karein
//         delivery.status = "Cancelled";

//         // Step 2: Parent subscription ko "inactive" karein
//         // subscription.is_active = false;

//         // Step 3: Paise wallet mein waapas karein
//         const wallet = await WalletModel.findOne({
//           phone_no: delivery.user.phone_no,
//         });
//         if (wallet) {
//           const refundAmount = subscription.plan.price_per_day;
//           wallet.balance += refundAmount;

//           // Ek credit transaction banayein
//           await TransactionModel.create({
//             walletId: wallet._id,
//             amount: refundAmount,
//             type: "credit",
//             status: "successful",
//             description: `Refund for undelivered one-time order #${delivery._id}`,
//           });

//           await wallet.save();
//         }
//         await delivery.save();
//         // await subscription.save();
//         console.log(
//           `Order ${delivery._id} cancelled and ₹${subscription.plan.price_per_day} refunded.`
//         );
//       }
//     } catch (error) {
//       console.error("Error in handling undelivered orders cron job:", error);
//     }
//   },
//   { timezone: "Asia/Kolkata" }
// );
// // CRON JOB 1: Har din subah 12 baje naye deliveries banayein
// cron.schedule(
//   "50 0 * * *",
//   async () => {
//     console.log("Running daily job to create deliveries...");
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const todayString = getTodayInKolkataString(); // ✅ USE THE NEW FUNCTION
//     const activeSubscriptions = await SubscriptionModel.find({
//       is_active: true,
//       validity_end_date: { $gte: today },
//     });

//     for (const sub of activeSubscriptions) {
//       const pausedDateStrings = sub.paused_dates.map(
//         (d) => new Date(d).toISOString().split("T")[0]
//       );
//       if (!pausedDateStrings.includes(todayString)) {
//         // Check karein ki is din ke liye delivery pehle se to nahi bani hai
//         const existingDelivery = await DeliveryModel.findOne({
//           subscription: sub._id,
//           delivery_date: todayString,
//         });
//         if (!existingDelivery) {
//           await DeliveryModel.create({
//             subscription: sub._id,
//             user: sub.user,
//             delivery_date: todayString,
//             status: "Pending",
//           });
//         }
//       }
//     }
//     console.log("Daily delivery creation job finished.");
//   },
//   { timezone: "Asia/Kolkata" }
// );
// // CRON JOB 1: Har din subah 1 baje wallet se paise kaatne ke liye
// cron.schedule(
//   "40 0 * * *",
//   async () => {
//     console.log("Running daily deduction cron job...");
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     try {
//       const activeSubscriptions = await SubscriptionModel.find({
//         is_active: true,
//         validity_end_date: { $gte: today },
//       });

//       for (const sub of activeSubscriptions) {
//         const todayString = getTodayInKolkataString(); // ✅ Use timezone-safe date
//         const lastDeduction = sub.last_deduction_date
//           ? new Date(sub.last_deduction_date)
//           : null;
//         if (lastDeduction && lastDeduction.getTime() >= today.getTime()) {
//           console.log(`Skipping ${sub.phone_no}: Already deducted today.`);
//           continue;
//         }
//         const pausedDateStrings = sub.paused_dates.map(
//           (d) => new Date(d).toISOString().split("T")[0]
//         );
//         if (pausedDateStrings.includes(todayString)) {
//           console.log(`Skipping ${sub.phone_no}: Delivery is paused today.`);
//           continue;
//         }

//         // 💡 FIX: Ab hum yahaan seedhe service ko call karenge
//         await performDeduction(sub);
//       }
//     } catch (error) {
//       console.error("Error in daily deduction cron job:", error);
//     }
//     console.log("Daily deduction cron job finished.");
//   },
//   { timezone: "Asia/Kolkata" }
// );

// // 💡 FIX: Expired subscriptions ke liye ALAG cron job
// // Ye job har din subah 1:05 baje chalega
// cron.schedule(
//   "30 0 * * *",
//   async () => {
//     console.log("Running daily job to deactivate expired subscriptions...");
//     try {
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
//       const result = await SubscriptionModel.updateMany(
//         { is_active: true, validity_end_date: { $lt: today } },
//         { $set: { is_active: false } }
//       );
//       if (result.modifiedCount > 0) {
//         console.log(
//           `Successfully deactivated ${result.modifiedCount} expired subscriptions.`
//         );
//       } else {
//         console.log("No subscriptions to deactivate today.");
//       }
//     } catch (error) {
//       console.error(
//         "Error in deactivating expired subscriptions cron job:",
//         error
//       );
//     }
//   },
//   { timezone: "Asia/Kolkata" }
// );

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
