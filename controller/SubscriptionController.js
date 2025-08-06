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

// ✅ FIX #2: This function now correctly finds the latest active subscription
export const getSubscriptionController = async (req, res) => {
  try {
    const { phone_no } = req.params;

    // Find all active subs, sort by newest first, and get the first one
    const subscriptions = await SubscriptionModel.find({
      phone_no,
      is_active: true,
    })
      .sort({ createdAt: -1 }) // Sort by creation date, newest first
      .limit(1); // Get only the most recent one

    if (!subscriptions || subscriptions.length === 0) {
      return res
        .status(404)
        .send({ success: false, message: "No active subscription found." });
    }

    // Send the first (and only) subscription in the array
    res.status(200).send({ success: true, subscription: subscriptions[0] });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

// updatePausedDatesController (This one is likely correct, but let's make it robust)
export const updatePausedDatesController = async (req, res) => {
  try {
    const { phone_no } = req.params;
    const { paused_dates } = req.body;

    if (!Array.isArray(paused_dates)) {
      return res
        .status(400)
        .send({ message: "paused_dates must be an array." });
    }

    // Find the LATEST active subscription and update it
    const latestSub = await SubscriptionModel.findOne({
      phone_no,
      is_active: true,
    }).sort({ createdAt: -1 });

    if (!latestSub) {
      return res.status(404).send({
        success: false,
        message: "No active subscription found to update.",
      });
    }

    latestSub.paused_dates = paused_dates;
    await latestSub.save();

    res.status(200).send({
      success: true,
      message: "Subscription updated successfully!",
      subscription: latestSub,
    });
  } catch (error) {
    console.error("Error updating paused dates:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};
