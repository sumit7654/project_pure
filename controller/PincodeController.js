// controllers/PincodeController.js

import Usermodel from "../model/Usermodel.js";

export const checkServiceabilityController = async (req, res) => {
  try {
    const { pincode } = req.params;
    if (!pincode) {
      return res
        .status(400)
        .send({ success: false, message: "Pincode is required." });
    }

    // Aise delivery boy ko dhundhein jise ye pincode assigned hai
    const deliveryBoy = await Usermodel.findOne({
      role: "deliveryBoy",
      assignedPincodes: pincode, // Check karein ki pincode array mein hai ya nahi
    });

    // Agar koi bhi delivery boy mil jaata hai, to service hai
    if (deliveryBoy) {
      return res.status(200).json({ success: true, serviceable: true });
    } else {
      // Nahi to, service nahi hai
      return res.status(200).json({ success: true, serviceable: false });
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error checking serviceability",
      error,
    });
  }
};
