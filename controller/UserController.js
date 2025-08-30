import mongoose from "mongoose";
import Usermodel from "./../model/Usermodel.js";
import SubscriptionModel from "./../model/SubscriptionModel.js";

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
    const user = await Usermodel.create({
      name,
      phone_no,
      password,
      role: "customer",
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
    if (!deliveryBoy || !deliveryBoy.assignedPincodes) {
      return res.status(404).send({
        success: false,
        message: "Delivery boy not found or no pincodes assigned.",
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allActiveSubscriptions = await SubscriptionModel.find({
      is_active: true,
      validity_end_date: { $gte: today },
    }).populate("user", "name address");
    const assignedDeliveries = allActiveSubscriptions.filter((sub) => {
      const userPincode = sub.user?.address?.pincode;
      const todayString = today.toISOString().split("T")[0];
      const pausedDateStrings = sub.paused_dates.map(
        (d) => new Date(d).toISOString().split("T")[0]
      );
      const isPaused = pausedDateStrings.includes(todayString);
      return (
        userPincode &&
        deliveryBoy.assignedPincodes.includes(userPincode) &&
        !isPaused
      );
    });
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
