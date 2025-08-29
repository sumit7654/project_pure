import dotenv from "dotenv";
dotenv.config();
import express from "express";
import connectDB from "./config/connectDB.js";
import cors from "cors";
import cron from "node-cron";
import Userroutes from "./routes/Userroutes.js";
import Walletroute from "./routes/Walletroute.js";
import SubscriptionRoute from "./routes/SubscriptionRoute.js";
import staffRoutes from "./routes/staffRoutes.js"; // File ka naam 'staffRoutes.js' maan rahe hain
import Razorpay from "razorpay";
import SubscriptionModel from "./model/SubscriptionModel.js";
import WalletModel from "./model/Walletmodel.js";
import TransactionModel from "./model/TransactionModel.js";

connectDB();

const instance = new Razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3541;

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.post("/create-order", async (req, res) => {
  // ... aapka order creation code ...
});

// Routes
app.use("/api/auth", Userroutes);
app.use("/api/v1/wallet", Walletroute);
app.use("/api/subscriptions", SubscriptionRoute);
app.use("/api/staff", staffRoutes);

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

    const activeSubscriptions = await SubscriptionModel.find({
      is_active: true,
      validity_end_date: { $gte: today },
    });

    for (const sub of activeSubscriptions) {
      try {
        const lastDeduction = sub.last_deduction_date
          ? new Date(sub.last_deduction_date)
          : null;
        if (lastDeduction && lastDeduction.getTime() >= today.getTime()) {
          console.log(`Skipping ${sub.phone_no}: Already deducted today.`);
          continue;
        }

        const todayString = today.toISOString().split("T")[0];
        const pausedDateStrings = sub.paused_dates.map(
          (d) => new Date(d).toISOString().split("T")[0]
        );
        if (pausedDateStrings.includes(todayString)) {
          console.log(`Skipping ${sub.phone_no}: Delivery is paused today.`);
          continue;
        }

        const wallet = await WalletModel.findOne({ phone_no: sub.phone_no });
        if (!wallet || wallet.balance < sub.plan.price_per_day) {
          console.log(
            `Deactivating subscription for ${sub.phone_no} due to low balance.`
          );
          sub.is_active = false;
          await sub.save();
          continue;
        }

        wallet.balance -= sub.plan.price_per_day;
        await TransactionModel.create({
          walletId: wallet._id,
          amount: sub.plan.price_per_day,
          type: "debit",
          status: "successful",
          description: `Daily subscription for ${sub.plan.name}`,
          razorpayPaymentId: `SUB_${sub._id}_${today.getTime()}`,
        });
        sub.last_deduction_date = today;
        await wallet.save();
        await sub.save();
        console.log(
          `Successfully deducted ₹${sub.plan.price_per_day} from ${sub.phone_no}.`
        );
      } catch (err) {
        console.error(
          `Failed to process subscription for ${sub.phone_no}:`,
          err
        );
      }
    }
    console.log("Daily deduction cron job finished.");
  },
  { timezone: "Asia/Kolkata" }
);

// 💡 FIX: Expired subscriptions ke liye ALAG cron job
// Ye job har din subah 1:05 baje chalega
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

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
