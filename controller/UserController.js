import Usermodel from "./../model/Usermodel.js";

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
    return res
      .status(400)
      .send({
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
      return res
        .status(404)
        .send({
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
      return res
        .status(400)
        .send({
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

// 💡 ADMIN/DELIVERY BOY KE LOGIN KE LIYE
export const loginStaffController = async (req, res) => {
  try {
    const { phone_no, password } = req.body;
    if (!phone_no || !password) {
      return res
        .status(400)
        .send({ message: "Phone number and password are required" });
    }

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
      },
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error in staff login", error });
  }
};
