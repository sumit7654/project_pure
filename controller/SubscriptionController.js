import SubscriptionModel from "../model/SubscriptionModel.js";
import { performDeduction } from "../services/deductionService.js";

// Naya subscription banane ke liye (Ye bilkul theek hai)
export const createSubscriptionController = async (req, res) => {
  try {
    const { phone_no, plan, startDate, userId } = req.body;
    if (!phone_no || !plan || !startDate || !userId) {
      return res
        .status(400)
        .send({ success: false, message: "Missing required fields." });
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + plan.duration_days);

    const newSubscription = await SubscriptionModel.create({
      user: userId,
      phone_no,
      plan,
      validity_start_date: start,
      validity_end_date: end,
    });

    console.log("Subscription created. Performing initial deduction...");
    await performDeduction(newSubscription);

    res.status(201).json({
      success: true,
      message: "Subscription created and first day charged successfully.",
      subscription: newSubscription,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error creating subscription",
      error: error.message,
    });
  }
};

// 💡 FIX: Ye function ab ek specific subscription ko uski ID se update karega
export const updatePausedDatesController = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { paused_dates } = req.body; // Ye "YYYY-MM-DD" format mein strings ka array hai

    if (!Array.isArray(paused_dates)) {
      return res
        .status(400)
        .send({ message: "paused_dates must be an array." });
    }

    // Pehle subscription ko database se laayein taaki hum purani dates se compare kar sakein
    const subscription = await SubscriptionModel.findById(subscriptionId);
    if (!subscription) {
      return res
        .status(404)
        .send({
          success: false,
          message: "No subscription found with this ID.",
        });
    }

    const oldPausedCount = subscription.paused_dates.length;
    const newPausedCount = paused_dates.length;

    let newValidityEndDate = new Date(subscription.validity_end_date);

    // 💡 FIX: Validity update karne ka logic
    if (newPausedCount > oldPausedCount) {
      // Ek date pause hui hai, to validity ek din aage badhayein
      newValidityEndDate.setDate(newValidityEndDate.getDate() + 1);
    } else if (newPausedCount < oldPausedCount) {
      // Ek date resume hui hai, to validity ek din peeche karein
      newValidityEndDate.setDate(newValidityEndDate.getDate() - 1);
    }

    // Database mein dono cheezein ek saath update karein
    const updatedSubscription = await SubscriptionModel.findByIdAndUpdate(
      subscriptionId,
      {
        paused_dates: paused_dates,
        validity_end_date: newValidityEndDate,
      },
      { new: true }
    );

    res.status(200).send({
      success: true,
      message: "Subscription updated successfully!",
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error("Error updating paused dates:", error);
    res
      .status(500)
      .send({ success: false, message: "Error updating paused dates", error });
  }
};

// User ke saare active subscriptions laane ke liye (Ye bilkul theek hai)
export const getUserActiveSubscriptionsController = async (req, res) => {
  try {
    const { phone_no } = req.params;
    const subscriptions = await SubscriptionModel.find({
      phone_no: phone_no,
      is_active: true,
    }).sort({ createdAt: -1 });

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active subscriptions found for this user.",
      });
    }

    res.status(200).json({
      success: true,
      subscriptions,
    });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching subscriptions", error });
  }
};

// User ki poori history laane ke liye (Ye bhi theek hai)
export const getAllUserSubscriptionsController = async (req, res) => {
  try {
    const { phone_no } = req.params;
    const subscriptions = await SubscriptionModel.find({
      phone_no: phone_no,
    }).sort({ createdAt: -1 });
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subscriptions found for this user.",
      });
    }
    res.status(200).json({
      success: true,
      subscriptions,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error fetching subscription history",
      error,
    });
  }
};
