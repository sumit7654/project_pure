import Usermodel from "./../model/Usermodel.js";
import mongoose from "mongoose"; // 💡 FIX: Mongoose ko import karein
import SubscriptionModel from "./../model/SubscriptionModel.js"; // 💡 Ye bhi zaroori hai
// ################################ CUSTOMER REGISTRATION ####################################
export const Registercontroller = async (req, res) => {
  const { name, phone_no, password, confirmpassword } = req.body;

  // --- Better Validation ---
  if (!name || !phone_no || !password || !confirmpassword) {
    return res
      .status(400)
      .send({ success: false, message: "All fields are required" });
  }
  if (password !== confirmpassword) {
    return res
      .status(400)
      .send({ success: false, message: "Passwords do not match" });
  }

  try {
    const exitinguser = await Usermodel.findOne({ phone_no });
    if (exitinguser) {
      return res
        .status(400)
        .send({ success: false, message: "User already registered" });
    }

    // 💡 FIX: Naye user ko hamesha 'customer' role milega
    const user = await Usermodel.create({
      name,
      phone_no,
      password,
      role: "customer",
    });

    res.status(201).send({
      success: true,
      message: "Successfully Registered",
      // 💡 FIX: Sirf zaroori data bhejein, password bilkul nahi
      user: {
        _id: user._id,
        name: user.name,
        phone_no: user.phone_no,
      },
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error in registration", error });
  }
};

// ################################ CUSTOMER LOGIN ####################################
export const Logincontroller = async (req, res) => {
  const { phone_no, password } = req.body;

  if (!phone_no || !password) {
    return res.status(400).send({
      success: false,
      message: "Phone number and password are required",
    });
  }

  try {
    // 💡 FIX: Sirf 'customer' role waale users ko hi is route se login karne dein
    const user = await Usermodel.findOne({ phone_no, role: "customer" }).select(
      "+password"
    );
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Invalid Credentials or not a customer account",
      });
    }

    const isMatch = await user.comparepassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .send({ success: false, message: "Invalid Credentials" });
    }

    res.status(200).json({
      success: true,
      message: "Login successfully",
      // 💡 FIX: Sirf zaroori data bhejein, password bilkul nahi
      user: {
        _id: user._id,
        name: user.name,
        phone_no: user.phone_no,
        role: user.role,
        address: user.address,
      },
    });
  } catch (error) {
    res.status(500).send({ success: false, message: "Error in login", error });
  }
};

// ################################ UPDATE LOCATION (FOR CUSTOMERS) ####################################
export const UpdateLocationController = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      houseNumber,
      landmark,
      street,
      city,
      pincode,
      latitude,
      longitude,
    } = req.body;

    if (!latitude || !longitude || !houseNumber) {
      return res.status(400).send({
        success: false,
        message: "Core address details are required.",
      });
    }

    const addressData = {
      houseNumber,
      landmark,
      street,
      city,
      pincode,
      location: { type: "Point", coordinates: [longitude, latitude] },
    };
    const user = await Usermodel.findByIdAndUpdate(
      userId,
      { address: addressData },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }

    res.status(200).send({
      success: true,
      message: "Location updated successfully!",
      user,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ success: false, message: "Error in updating location", error });
  }
};

// ##############################################################################
// ################################ STAFF SECTION ####################################
// ##############################################################################

// 💡 ADMIN DWARA NAYA STAFF BANANE KE LIYE
export const registerStaffController = async (req, res) => {
  try {
    const { name, phone_no, password, role } = req.body;

    if (!name || !phone_no || !password || !role) {
      return res.status(400).send({ message: "All staff fields are required" });
    }
    if (!["admin", "deliveryBoy"].includes(role)) {
      return res
        .status(400)
        .send({ message: "Invalid role specified for staff" });
    }

    const existingUser = await Usermodel.findOne({ phone_no });
    if (existingUser) {
      return res
        .status(400)
        .send({ message: "User with this phone number already exists" });
    }

    const user = await Usermodel.create({ name, phone_no, password, role });
    res.status(201).send({
      success: true,
      message: `${role} registered successfully`,
      user: { _id: user._id, name: user.name, role: user.role },
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error in staff registration", error });
  }
};

// controllers/UserController.js

// ... (baaki saare controllers waise hi rahenge) ...

// 💡 ADMIN/DELIVERY BOY KE LOGIN KE LIYE (DEFINITIVE FIX)
export const loginStaffController = async (req, res) => {
  console.log("\n--- Staff login request received ---");
  try {
    const { phone_no, password } = req.body;
    console.log(`Step 1: Received phone as text: "${phone_no}"`);

    if (!phone_no || !password) {
      return res
        .status(400)
        .send({ message: "Phone number and password are required" });
    }

    // 💡 FIX: Frontend se aaye text waale phone number ko Number mein badlein
    const numeric_phone_no = Number(phone_no);
    console.log(
      `Step 2: Searching database for phone as number: ${numeric_phone_no}`
    );

    // 💡 FIX: Database mein Number se hi search karein
    const user = await Usermodel.findOne({ phone_no: numeric_phone_no }).select(
      "+password"
    );

    if (!user) {
      console.log("DB check FAILED: User not found with this number.");
      return res.status(404).send({ message: "Invalid credentials" });
    }
    console.log(`Step 3: User FOUND. Name: ${user.name}, Role: '${user.role}'`);

    if (user.role === "customer") {
      console.log("Authorization FAILED: User is a customer, not staff.");
      return res
        .status(403)
        .send({ message: "This account is not authorized for staff panel." });
    }
    console.log("Step 4: User is staff. Proceeding to password check.");

    const isMatch = await user.comparepassword(password);

    if (!isMatch) {
      console.log("Password check FAILED: Passwords do not match.");
      return res.status(401).send({ message: "Invalid credentials" });
    }
    console.log("Step 5: Password matched successfully!");

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        phone_no: user.phone_no,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("!!!!!!!!!! CATCH BLOCK ERROR !!!!!!!!!!");
    console.error(
      "An unexpected error occurred in loginStaffController:",
      error
    );
    res
      .status(500)
      .send({ success: false, message: "An internal server error occurred." });
  }
};

// controllers/UserController.js

// ... (aapke purane saare controllers) ...

// 💡 NAYA FUNCTION: Dashboard ke liye statistics laane ke liye
// controllers/UserController.js

// ... (baaki saare controllers waise hi rahenge) ...

// 💡 NAYA FUNCTION: Dashboard ke liye statistics laane ke liye (DEBUGGING VERSION)
// ################################ DASHBOARD & DELIVERIES SECTION ####################################

export const getDashboardStatsController = async (req, res) => {
  try {
    const [totalOrders, totalUsers, deliveryStaff] = await Promise.all([
      // 💡 FIX: Seedhe import kiye hue model ka istemal karein
      SubscriptionModel.countDocuments(),
      Usermodel.countDocuments({ role: "customer" }),
      Usermodel.countDocuments({ role: "deliveryBoy" }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        deliveryStaff,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching dashboard stats",
      error,
    });
  }
};

export const getTodaysDeliveriesController = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split("T")[0];

    const activeSubscriptions = await SubscriptionModel.find({
      is_active: true,
      validity_end_date: { $gte: today },
    }).populate("user", "name address");

    const deliveries = activeSubscriptions.filter((sub) => {
      const pausedDateStrings = sub.paused_dates.map(
        (d) => new Date(d).toISOString().split("T")[0]
      );
      return !pausedDateStrings.includes(todayString);
    });

    res.status(200).json({
      success: true,
      deliveries,
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching deliveries", error });
  }
};
