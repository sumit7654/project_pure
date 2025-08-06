// backend/controllers/SubscriptionController.js

import SubscriptionModel from "../model/SubscriptionModel.js";

export const createSubscriptionController = async (req, res) => {
  try {
    console.log(
      "--- Received request to create subscription with body: ---",
      req.body
    );
    // 1. We now get the complete plan object from the request body
    const { phone_no, planDetails, validity_in_days, skip_days } = req.body;
    console.log(req.body);

    // Basic validation
    if (!phone_no || !planDetails || !validity_in_days) {
      return res.status(400).send({ message: "Required fields are missing" });
    }

    if (!planDetails.name || !planDetails.price_per_day) {
      return res
        .status(400)
        .send({ message: "Plan details (name, price) are required." });
    }

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + parseInt(validity_in_days, 10));

    // 2. We use the planDetails object directly to create the subscription
    const newSubscription = new SubscriptionModel({
      phone_no,
      plan: {
        name: planDetails.name,
        price_per_day: planDetails.price_per_day,
      },
      validity_start_date: today,
      validity_end_date: endDate,
      skip_days: skip_days || [],
    });

    await newSubscription.save();

    res.status(201).send({
      success: true,
      message: "Subscription created successfully!",
      subscription: newSubscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

// --- NEW FUNCTION 1: Get user's active subscription ---
export const getSubscriptionController = async (req, res) => {
  try {
    const { phone_no } = req.params;
    // Find the subscription that is currently active for the user
    const subscription = await SubscriptionModel.findOne({
      phone_no,
      is_active: true,
    });

    if (!subscription) {
      return res
        .status(404)
        .send({ success: false, message: "No active subscription found." });
    }

    res.status(200).send({ success: true, subscription });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

// --- NEW FUNCTION 2: Update paused dates ---
export const updatePausedDatesController = async (req, res) => {
  try {
    const { phone_no } = req.params;
    const { paused_dates } = req.body; // Expecting an array of date strings

    if (!Array.isArray(paused_dates)) {
      return res
        .status(400)
        .send({ message: "paused_dates must be an array." });
    }

    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
      { phone_no, is_active: true },
      { paused_dates: paused_dates },
      { new: true } // Return the updated document
    );

    if (!updatedSubscription) {
      return res
        .status(404)
        .send({
          success: false,
          message: "No active subscription found to update.",
        });
    }

    res
      .status(200)
      .send({
        success: true,
        message: "Subscription updated successfully!",
        subscription: updatedSubscription,
      });
  } catch (error) {
    console.error("Error updating paused dates:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};
