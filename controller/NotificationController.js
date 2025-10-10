// controllers/NotificationController.js

import NotificationModel from "../model/NotificationModel.js";

export const getNotificationsController = async (req, res) => {
  try {
    // Step 1: User ki ID request parameters se nikalein
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .send({ success: false, message: "User ID is required." });
    }

    // Step 2: Database mein us user ke saare notifications dhundhein
    const notifications = await NotificationModel.find({ recipient: userId })
      .sort({ createdAt: -1 }) // Step 3: Sabse naye notifications ko sabse upar rakhein
      .limit(50); // Ek baar mein 50 se zyada notifications na bhejein (performance ke liye)

    // Step 4: Safal response bhejein
    res.status(200).send({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error in getNotificationsController:", error);
    res.status(500).send({
      success: false,
      message: "Error fetching notifications.",
      error: error.message,
    });
  }
};

export const markAsReadController = async (req, res) => {
  // Yeh function aap baad mein bana sakte hain jab user notification par click kare
  // Abhi ke liye getNotificationsController zaroori hai.
};
