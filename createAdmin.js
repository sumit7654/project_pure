// createAdmin.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Usermodel from "./model/Usermodel.js";
import connectDB from "./config/connectDB.js";

dotenv.config();

// ===============================================================
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
//         SIRF IS HISSE MEIN APNA DATA DAALEIN
// ===============================================================

const ADMIN_NAME = "Sumit Kumar";
const ADMIN_PHONE = "8864039966"; // Yahi phone number istemal karein
const ADMIN_PASSWORD = "Sumit@123"; // Yahi password istemal karein

// ===============================================================
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
// ===============================================================

const createFirstAdmin = async () => {
  console.log("Connecting to database...");
  await connectDB();
  console.log("Database connected.");

  try {
    // 💡 FIX: Usi phone number se purane user ko dhundhein
    const existingUser = await Usermodel.findOne({ phone_no: ADMIN_PHONE });

    if (existingUser) {
      console.log(
        `User with phone number ${ADMIN_PHONE} already exists. Deleting it first to ensure a clean state.`
      );
      await Usermodel.deleteOne({ phone_no: ADMIN_PHONE });
      console.log("Old user deleted successfully.");
    }

    // Ab ek bilkul naya, theek se hashed user banayein
    // NOTE: Hum yahaan .save() ka istemal karenge taaki Mongoose ka pre-save hook chale
    const adminUser = new Usermodel({
      name: ADMIN_NAME,
      phone_no: ADMIN_PHONE,
      password: ADMIN_PASSWORD, // Plain password dein, model ise khud hash karega
      role: "admin",
    });

    await adminUser.save();
    console.log("✅ New Admin user created successfully!");
    console.log(`   Phone: ${ADMIN_PHONE}`);
    console.log(`   Password: ${ADMIN_PASSWORD} (Use this to login)`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    console.log("Closing database connection.");
    await mongoose.disconnect();
    process.exit(0);
  }
};

createFirstAdmin();
