// backend/controllers/SubscriptionController.js

import SubscriptionModel from "../model/SubscriptionModel.js";

// ✅ FIX #1: This function now prevents creating duplicate subscriptions
export const createSubscriptionController = async (req, res) => {
  try {
    const { phone_no, planDetails, validity_in_days, skip_days } = req.body;

    if (!phone_no || !planDetails || !validity_in_days) {
      return res.status(400).send({ message: "Required fields are missing" });
    }

    // --- NEW LOGIC: Check for an existing active subscription first ---
    const existingSubscription = await SubscriptionModel.findOne({
      phone_no,
      is_active: true,
    });
    if (existingSubscription) {
      return res.status(400).send({
        success: false,
        message: "An active subscription already exists for this user.",
      });
    }
    // --- END OF NEW LOGIC ---

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

export const getActiveSubscriptionsController = async (req, res) => {
  try {
    const { phone_no } = req.params;

    // Use .find() to get all matching documents
    const subscriptions = await SubscriptionModel.find({
      phone_no,
      is_active: true,
    }).sort({ createdAt: -1 }); // Sort by newest first

    // It's not an error if the array is empty, just send an empty array
    res.status(200).send({ success: true, subscriptions });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

// ✅ NEW: This function now updates a SPECIFIC subscription by its ID
export const updatePausedDatesController = async (req, res) => {
  try {
    const { subId } = req.params; // We now use the unique subscription ID
    const { paused_dates } = req.body;

    if (!Array.isArray(paused_dates)) {
      return res
        .status(400)
        .send({ message: "paused_dates must be an array." });
    }

    const updatedSubscription = await SubscriptionModel.findByIdAndUpdate(
      subId,
      { paused_dates: paused_dates },
      { new: true } // Return the updated document
    );

    if (!updatedSubscription) {
      return res
        .status(404)
        .send({ success: false, message: "Subscription not found to update." });
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
