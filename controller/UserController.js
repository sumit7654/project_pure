import mongoose from "mongoose";
import Usermodel from "./../model/Usermodel.js";
import SubscriptionModel from "./../model/SubscriptionModel.js";
import DeliveryModel from "./../model/DeliveryModel.js"; // Delivery model import karein
import crypto from "crypto";
// ##############################################################################
// ################################ CUSTOMER SECTION ####################################
// ##############################################################################

export const Registercontroller = async (req, res) => {
  const { name, phone_no, password, confirmpassword } = req.body;
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
    const baseName = name.substring(0, 4).toUpperCase();
    const randomDigits = crypto.randomInt(100, 999);
    const referralCode = `${baseName}${randomDigits}`;

    const user = await Usermodel.create({
      name,
      phone_no,
      password,
      role: "customer",
      referralCode: referralCode,
    });
    res.status(201).send({
      success: true,
      message: "Successfully Registered",
      user: { _id: user._id, name: user.name, phone_no: user.phone_no },
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error in registration", error });
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
        referralCode: user.referralCode, // Yeh pehle se hoga
        referredBy: user.referredBy,
      },
    });
  } catch (error) {
    res.status(500).send({ success: false, message: "Error in login", error });
  }
};

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
    res
      .status(500)
      .send({ success: false, message: "Error in updating location", error });
  }
};

// ##############################################################################
// ################################ STAFF SECTION ####################################
// ##############################################################################

export const registerStaffController = async (req, res) => {
  try {
    // 💡 FIX: Ab hum 'assignedPincodes' bhi req.body se lenge
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

    // ✅ NAYA LOGIC: REFERRAL CODE BANANE KE LIYE
    // Ek simple code: Naam ke shuruaati 4 अक्षर + 3 random अंक
    const baseName = name.substring(0, 4).toUpperCase();
    const randomDigits = crypto.randomInt(100, 999);
    const referralCode = `${baseName}${randomDigits}`;
    // Naya user banate samay 'assignedPincodes' ko bhi save karein
    const user = await Usermodel.create({
      name,
      phone_no,
      password,
      role,
      assignedPincodes,
    });

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

export const loginStaffController = async (req, res) => {
  try {
    const { phone_no, password } = req.body;
    if (!phone_no || !password) {
      return res
        .status(400)
        .send({ message: "Phone number and password are required" });
    }
    const user = await Usermodel.findOne({ phone_no: Number(phone_no) }).select(
      "+password"
    );
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
      },
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error in staff login", error });
  }
};

export const getDashboardStatsController = async (req, res) => {
  try {
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
    res.status(500).send({
      success: false,
      message: "Error fetching dashboard stats",
      error,
    });
  }
};

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
    const { userId } = req.params; // Logged-in user ki ID
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).send({ message: "Referral code is required." });
    }

    // 1. Refer karne wale user ko dhoondhein
    const referrer = await Usermodel.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).send({ message: "Invalid referral code." });
    }

    // 2. Naye user ko update karein
    const user = await Usermodel.findById(userId);
    if (user.referredBy) {
      return res
        .status(400)
        .send({ message: "Referral code already applied." });
    }

    user.referredBy = referralCode;
    await user.save();

    res
      .status(200)
      .send({ success: true, message: "Referral code applied successfully!" });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error applying code.", error });
  }
};
