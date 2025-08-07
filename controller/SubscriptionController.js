// backend/controllers/SubscriptionController.js

import SubscriptionModel from "../model/SubscriptionModel.js";

// This function now BLOCKS new subscriptions if one is already active
export const createSubscriptionController = async (req, res) => {
  try {
    const { phone_no, planDetails, validity_in_days, skip_days } = req.body;

    if (!phone_no || !planDetails || !validity_in_days) {
      return res.status(400).send({ message: "Required fields are missing" });
    }

    // --- LOGIC TO BLOCK DUPLICATES ---
    const existingSubscription = await SubscriptionModel.findOne({
      phone_no,
      is_active: true,
    });
    if (existingSubscription) {
      return res
        .status(400)
        .send({
          success: false,
          message: "An active subscription already exists for this user.",
        });
    }
    // --- END OF LOGIC ---

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + parseInt(validity_in_days, 10));

    const newSubscription = new SubscriptionModel({
      phone_no,
      plan: {
        name: planDetails.name,
        price_per_day: planDetails.price_per_day,
      },
      validity_start_date: today,
      validity_end_date: endDate,
      skip_days: skip_days || [],
      is_active: true,
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

// This function now gets only ONE subscription
export const getSubscriptionController = async (req, res) => {
  try {
    const { phone_no } = req.params;
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

// This function updates the single active subscription
export const updatePausedDatesController = async (req, res) => {
  try {
    const { phone_no } = req.params;
    const { paused_dates } = req.body;

    if (!Array.isArray(paused_dates)) {
      return res
        .status(400)
        .send({ message: "paused_dates must be an array." });
    }

    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
      { phone_no, is_active: true },
      { paused_dates: paused_dates },
      { new: true }
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
