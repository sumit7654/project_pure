// createAdmin.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Usermodel from "./model/Usermodel.js"; // Apne User model ka path check kar lein
import connectDB from "./config/connectDB.js"; // Apne DB connection file ka path check kar lein

dotenv.config();

// ===============================================================
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
//             SIRF IS HISSE MEIN APNA DATA DAALEIN
// ===============================================================

const ADMIN_NAME = "Sumit Kumar"; // Yahaan apna naam daalein
const ADMIN_PHONE = "8864039966"; // Yahaan apna phone number daalein
const ADMIN_PASSWORD = "Sumit@123"; // Yahaan apna password daalein

// ===============================================================
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
// ===============================================================

const createFirstAdmin = async () => {
  console.log("Connecting to database...");
  await connectDB();
  console.log("Database connected.");

  try {
    const existingAdmin = await Usermodel.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists. Aborting.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const adminUser = new Usermodel({
      name: ADMIN_NAME,
      phone_no: ADMIN_PHONE,
      password: hashedPassword,
      role: "admin",
    });

    await adminUser.save();
    console.log("✅ Admin user created successfully!");
    console.log(`   Phone: ${ADMIN_PHONE}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    console.log("Closing database connection.");
    await mongoose.disconnect();
    process.exit(0);
  }
};

createFirstAdmin();
