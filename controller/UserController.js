import mongoose from "mongoose";
import Usermodel from "./../model/Usermodel.js";
import DeliveryModel from "./../model/DeliveryModel.js";
import crypto from "crypto";
import SubscriptionModel from "./../model/SubscriptionModel.js";
import WalletModel from "./../model/WalletModel.js"; // <-- ✅ YAHAN IMPORT KAREIN
// import Usermodel from "./../model/Usermodel.js";

// ##############################################################################
// ################################ CUSTOMER SECTION ####################################
// ##############################################################################

// +++ ✅ YEH NAYA AUR SAHI REGISTER CONTROLLER HAI +++
export const Registercontroller = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, phone_no, password, confirmpassword } = req.body;

    if (!name || !phone_no || !password || !confirmpassword) {
      throw new Error("All fields are required");
    }
    if (password !== confirmpassword) {
      throw new Error("Passwords do not match");
    }

    const existingUser = await Usermodel.findOne({ phone_no }).session(session);
    if (existingUser) {
      throw new Error("User already registered");
    }

    // 1. User ke liye ek naya Wallet banayein
    const newWallet = new WalletModel({ balance: 0 });
    const savedWallet = await newWallet.save({ session });

    // 2. User ka data taiyaar karein
    const baseName = name.substring(0, 4).toUpperCase();
    const randomDigits = crypto.randomInt(100, 999);
    const referralCode = `${baseName}${randomDigits}`;

    const user = new Usermodel({
      name,
      phone_no,
      password,
      role: "customer",
      referralCode: referralCode,
      walletId: savedWallet._id, // <-- ✅ Naye wallet ki ID ko yahan jodein
    });

    // 3. User ko save karne se pehle Wallet mein user ki ID update karein
    savedWallet.user = user._id;
    await savedWallet.save({ session });

    await user.save({ session });

    await session.commitTransaction();

    res.status(201).send({
      success: true,
      message: "Successfully Registered",
      user: { _id: user._id, name: user.name, phone_no: user.phone_no },
    });
  } catch (error) {
    // Koi bhi galti hone par transaction ko reverse kar dein
    await session.abortTransaction();
    console.error("CUSTOMER REGISTRATION ERROR:", error);
    res.status(400).send({
      // Use 400 for client errors like "User already exists"
      success: false,
      message: error.message || "Error in registration",
    });
  } finally {
    session.endSession();
  }
};

export const Logincontroller = async (req, res) => {
  const { phone_no, password } = req.body;
  if (!phone_no || !password) {
    return res.status(400).send({
      success: false,
      message: "Phone number and password are required",
    });
  }
  try {
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
      user: {
        _id: user._id,
        name: user.name,
        phone_no: user.phone_no,
        role: user.role,
        address: user.address,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
      },
    });
  } catch (error) {
    console.error("CUSTOMER LOGIN ERROR:", error);
    res.status(500).send({
      success: false,
      message: "Error in login",
      error: error.message,
    });
  }
};

export const UpdateLocationController = async (req, res) => {
  console.log("✅ REQUEST REACHED UpdateLocationController!");
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
    console.error("LOCATION UPDATE ERROR:", error);
    res.status(500).send({
      success: false,
      message: "Error in updating location",
      error: error.message,
    });
  }
};

// ##############################################################################
// ################################ STAFF SECTION ####################################
// ##############################################################################

export const registerStaffController = async (req, res) => {
  try {
    const { name, phone_no, password, role, assignedPincodes } = req.body;

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

    const baseName = name.substring(0, 4).toUpperCase();
    const randomDigits = crypto.randomInt(100, 999);
    const referralCode = `${baseName}${randomDigits}`;

    const user = await Usermodel.create({
      name,
      phone_no,
      password,
      role,
      assignedPincodes,
      referralCode: referralCode, // ✅ THE FIX WAS MISSING HERE
    });

    res.status(201).send({
      success: true,
      message: `${role} registered successfully`,
      user: { _id: user._id, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error("STAFF REGISTRATION ERROR:", error);
    res.status(500).send({
      success: false,
      message: "Error in staff registration",
      error: error.message,
    });
  }
};

export const loginStaffController = async (req, res) => {
  try {
    const { phone_no, password } = req.body;
    if (!phone_no || !password) {
      return res
        .status(400)
        .send({ message: "Phone number and password are required" });
    }
    // Treat phone_no as a string for consistency
    const user = await Usermodel.findOne({ phone_no }).select("+password");
    if (!user || user.role === "customer") {
      return res
        .status(404)
        .send({ message: "Not a staff account or invalid credentials" });
    }
    const isMatch = await user.comparepassword(password);
    if (!isMatch) {
      return res.status(401).send({ message: "Invalid credentials" });
    }
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        phone_no: user.phone_no,
        role: user.role,
        address: user.address, // ✅ Send address for staff too
        referralCode: user.referralCode, // ✅ THE FIX WAS MISSING HERE
        referredBy: user.referredBy, // ✅ THE FIX WAS MISSING HERE
      },
    });
  } catch (error) {
    console.error("STAFF LOGIN ERROR:", error);
    res.status(500).send({
      success: false,
      message: "Error in staff login",
      error: error.message,
    });
  }
};

// ... (Other controllers like getDashboardStatsController can remain as they are) ...
export const getTodaysDeliveriesController = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const deliveryBoy = await Usermodel.findById(deliveryBoyId);

    if (
      !deliveryBoy ||
      !deliveryBoy.assignedPincodes ||
      deliveryBoy.assignedPincodes.length === 0
    ) {
      return res.status(200).json({ success: true, deliveries: [] });
    }

    const todayString = new Date().toISOString().split("T")[0];

    const todaysDeliveries = await DeliveryModel.find({
      delivery_date: todayString,
      status: "Pending",
    })
      .populate({
        path: "user",
        select: "name address",
        match: { "address.pincode": { $in: deliveryBoy.assignedPincodes } },
      })
      .populate("subscription", "plan");

    const assignedDeliveries = todaysDeliveries.filter(
      (delivery) => delivery.user
    );

    res.status(200).json({
      success: true,
      deliveries: assignedDeliveries,
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching deliveries", error });
  }
};
export const getUnassignedDeliveriesController = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allDeliveryBoys = await Usermodel.find({ role: "deliveryBoy" });
    const allAssignedPincodes = new Set(
      allDeliveryBoys.flatMap((boy) => boy.assignedPincodes)
    );
    console.log("All assigned pincode : ", allAssignedPincodes);
    const allActiveSubscriptions = await SubscriptionModel.find({
      is_active: true,
      validity_end_date: { $gte: today },
    }).populate("user", "name address");
    const unassignedDeliveries = allActiveSubscriptions.filter((sub) => {
      const userPincode = sub.user?.address?.pincode;
      const todayString = today.toISOString().split("T")[0];
      const pausedDateStrings = sub.paused_dates.map(
        (d) => new Date(d).toISOString().split("T")[0]
      );
      const isPaused = pausedDateStrings.includes(todayString);
      return userPincode && !allAssignedPincodes.has(userPincode) && !isPaused;
    });
    res.status(200).json({
      success: true,
      deliveries: unassignedDeliveries,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error fetching unassigned deliveries",
      error,
    });
  }
};

export const applyReferralCodeController = async (req, res) => {
  try {
    const { userId } = req.params; // The ID of the user trying to APPLY the code
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).send({ message: "Referral code is required." });
    } // ✅ FIX #1: Make the search case-insensitive using a regular expression

    const referrer = await Usermodel.findOne({
      referralCode: { $regex: new RegExp(`^${referralCode}$`, "i") },
    });

    if (!referrer) {
      return res.status(404).send({ message: "Invalid referral code." });
    } // Find the user who is logged in

    const user = await Usermodel.findById(userId); // ✅ FIX #2: Prevent a user from using their own referral code

    if (referrer._id.toString() === user._id.toString()) {
      return res
        .status(400)
        .send({ message: "You cannot use your own referral code." });
    }

    if (user.referredBy) {
      return res.status(400).send({
        message: "A referral code has already been applied to your account.",
      });
    }

    user.referredBy = referrer.referralCode; // Store the original, properly cased code
    await user.save();

    res
      .status(200)
      .send({ success: true, message: "Referral code applied successfully!" });
  } catch (error) {
    console.error("APPLY REFERRAL ERROR:", error); // Better logging
    res.status(500).send({
      success: false,
      message: "Error applying code.",
      error: error.message,
    });
  }
};

// controller/UserController.js

export const getDashboardStatsController = async (req, res) => {
  try {
    // We need to import these models at the top of the file if they aren't already
    // import SubscriptionModel from "./../model/SubscriptionModel.js";
    // import Usermodel from "./../model/Usermodel.js";

    const [totalSubscriptions, totalUsers, deliveryStaff] = await Promise.all([
      SubscriptionModel.countDocuments(),
      Usermodel.countDocuments({ role: "customer" }),
      Usermodel.countDocuments({ role: "deliveryBoy" }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders: totalSubscriptions,
        totalUsers,
        deliveryStaff,
      },
    });
  } catch (error) {
    console.error("DASHBOARD STATS ERROR:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
};
