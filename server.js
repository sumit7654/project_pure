// import React from "react";
import express, { json } from "express";
import connectDB from "./config/connectDB.js";
import color from "colors";
import cors from "cors";
import dotenv from "dotenv";
import Userroutes from "./routes/Userroutes.js";
import Walletroute from "./routes/Walletroute.js";
import SubscriptionRoute from "./routes/SubscriptionRoute.js";
import Razorpay from "razorpay";
// import Addproductroutes from "./routes/Addproductroutes.js";
// import cloudinary from "cloudinary";
// import upload from "./middleware/uploadmiddleware.js";
dotenv.config();

connectDB();

const instance = new Razorpay({
  key_id: process.env.KEY_ID, // अपनी Test Key ID यहाँ डालें
  key_secret: process.env.KEY_SECRET, // अपना Test Key Secret यहाँ डालें
});

const app = express();

const PORT = process.env.PORT || 3541;
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

app.use(express.json());
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const options = {
      amount: Number(amount), // Ensure amount is a number
      currency: "INR",
      receipt: `receipt_order_${new Date().getTime()}`,
    };
    const order = await instance.orders.create(options);

    if (!order) {
      return res.status(500).json({ error: "Order creation failed" });
    }

    console.log("Order Created Successfully: ".bgGreen, order);
    res.json(order);
  } catch (error) {
    console.error("Error in /create-order: ".bgRed, error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Test route to check if server is working

app.use("/api/auth", Userroutes);
app.use("/api/v1/wallet", Walletroute);
app.use("/api/subscriptions", SubscriptionRoute);
// app.use("/api/products", Addproductroutes);
// Cron Job - यह हर दिन सुबह 1 बजे चलेगा ('0 1 * * *')
cron.schedule(
  "0 1 * * *",
  async () => {
    console.log("Running daily deduction cron job...");

    const today = new Date();
    today.setHours(0, 0, 0, 0); // आज की तारीख, समय 00:00:00

    // आज के दिन का नाम (जैसे 'Sunday', 'Monday')
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });

    // सभी एक्टिव सब्सक्रिप्शन खोजें जिनकी वैलिडिटी खत्म नहीं हुई है
    const activeSubscriptions = await SubscriptionModel.find({
      is_active: true,
      validity_end_date: { $gte: today },
    });

    for (const sub of activeSubscriptions) {
      try {
        // --- चेक करें कि आज déduction होना चाहिए या नहीं ---
        const lastDeduction = sub.last_deduction_date
          ? new Date(sub.last_deduction_date)
          : null;
        if (lastDeduction && lastDeduction.getTime() === today.getTime()) {
          console.log(`Skipping ${sub.phone_no}: Already deducted today.`);
          continue; // आज पहले ही कट चुका है, तो अगला देखें
        }

        if (sub.skip_days.includes(dayOfWeek)) {
          console.log(
            `Skipping ${sub.phone_no}: It's a skip day (${dayOfWeek}).`
          );
          continue; // आज skip day है, तो अगला देखें
        }

        // (आप paused_dates के लिए भी ऐसी ही चेकिंग कर सकते हैं)

        // --- déduction की प्रक्रिया ---
        const wallet = await WalletModel.findOne({ phone_no: sub.phone_no });

        if (!wallet || wallet.balance < sub.plan.price_per_day) {
          console.log(
            `Deactivating subscription for ${sub.phone_no} due to insufficient balance.`
          );
          sub.is_active = false; // बैलेंस नहीं है, तो सब्सक्रिप्शन बंद कर दें
          await sub.save();
          continue;
        }

        // वॉलेट से पैसे काटें
        wallet.balance -= sub.plan.price_per_day;

        // ट्रांजैक्शन रिकॉर्ड बनाएं
        await TransactionModel.create({
          walletId: wallet._id,
          amount: sub.plan.price_per_day,
          type: "debit",
          status: "successful",
          razorpayPaymentId: `SUB_${sub._id}_${today.getTime()}`, // एक यूनिक आईडी
        });

        // सब्सक्रिप्शन में आज की तारीख अपडेट करें
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
  {
    timezone: "Asia/Kolkata", // भारत का टाइमजोन
  }
);

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`.bgBlue.red);
});
