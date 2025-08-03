// import React from "react";
import express, { json } from "express";
import connectDB from "./config/connectDB.js";
import color from "colors";
import cors from "cors";
import dotenv from "dotenv";
import Userroutes from "./routes/Userroutes.js";
import Razorpay from "razorpay";
// import Addproductroutes from "./routes/Addproductroutes.js";
import cloudinary from "cloudinary";
// import upload from "./middleware/uploadmiddleware.js";
dotenv.config();

connectDB();

const instance = new Razorpay({
  key_id: process.env.KEY_ID, // अपनी Test Key ID यहाँ डालें
  key_secret: process.env.KEY_SECRET, // अपना Test Key Secret यहाँ डालें
});

const app = express();

const PORT = process.env.PORT || 8080;
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

    // ऐप को ऑर्डर की डिटेल्स JSON में भेजें
    console.log("Order Created Successfully: ".bgGreen, order);
    res.json(order);
  } catch (error) {
    // अगर कोई गड़बड़ी हो तो उसे लॉग करें और एरर भेजें
    console.error("Error in /create-order: ".bgRed, error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Test route to check if server is working

app.use("/api/auth", Userroutes);
// app.use("/api/products", Addproductroutes);

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`.bgBlue.red);
});
