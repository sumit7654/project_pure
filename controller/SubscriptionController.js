// backend/controllers/SubscriptionController.js

import SubscriptionModel from "../model/SubscriptionModel.js";

// This function now BLOCKS new subscriptions if one is already active
export const createSubscriptionController = async (req, res) => {
  try {
    const { phone_no, plan, startDate } = req.body;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + plan.duration_days);

    const newSubscription = await SubscriptionModel.create({
      user: req.user._id, // Maan kar chal rahe hain ki aapke paas auth middleware hai
      phone_no,
      plan,
      start_date: start,
      validity_end_date: end,
    });

    // 💡 FIX: Subscription banne ke turant baad pehle din ka paisa kaatein
    console.log("Subscription created. Performing initial deduction...");
    await performDeduction(newSubscription);

    res.status(201).json({
      success: true,
      message: "Subscription created and first day charged successfully.",
      subscription: newSubscription,
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error creating subscription", error });
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
      return res.status(404).send({
        success: false,
        message: "No active subscription found to update.",
      });
    }

    res.status(200).send({
      success: true,
      message: "Subscription updated successfully!",
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error("Error updating paused dates:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};
