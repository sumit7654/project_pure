// controllers/DeliveryController.js

import DeliveryModel from "../model/DeliveryModel.js";

export const createDeliveryController = async (req, res) => {
  try {
    const { subscriptionId, userId, deliveryDate } = req.body;

    const delivery = new DeliveryModel({
      subscription: subscriptionId,
      user: userId,
      delivery_date: deliveryDate, // "YYYY-MM-DD"
      // status default: "Pending"
    });

    await delivery.save();

    res.status(201).json({
      success: true,
      message: "Delivery created successfully",
      delivery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating delivery",
      error,
    });
  }
};

export const markAsDeliveredController = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await DeliveryModel.findByIdAndUpdate(
      deliveryId,
      { status: "Delivered" },
      { new: true }
    ).populate("subscription"); // 💡 Subscription ki details bhi saath mein laayein

    if (!delivery) {
      return res
        .status(404)
        .send({ success: false, message: "Delivery not found." });
    }

    // 💡 FIX: Yahaan par check karein ki kya ye ek one-time plan tha
    const subscription = delivery.subscription;
    if (subscription && subscription.plan.duration_days === 1) {
      console.log(
        `One-time subscription ${subscription._id} completed. Deactivating...`
      );
      subscription.is_active = false;
      await subscription.save();
    }

    res.status(200).json({
      success: true,
      message: "Delivery marked as complete.",
      delivery,
    });
  } catch (error) {
    console.error("Error marking delivery as complete:", error);
    res.status(500).send({
      success: false,
      message: "Error updating delivery status",
      error,
    });
  }
};
