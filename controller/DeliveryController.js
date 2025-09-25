// controllers/DeliveryController.js
import mongoose from "mongoose";
import DeliveryModel from "../model/DeliveryModel.js";
import SubscriptionModel from "../model/SubscriptionModel.js";
import DeliveryModel from "../model/DeliveryModel.js";
import { getTodayInKolkataString } from "../utils/dateHelper.js";

export const getTodaysDeliveriesForAdminController = async (req, res) => {
  try {
    // 1. Apne timezone ke anusaar aaj ki sahi tarikh nikaalein
    const todayString = getTodayInKolkataString();

    // 2. Sirf aaj ki tarikh waale saare deliveries dhoondhein
    const deliveries = await DeliveryModel.find({ delivery_date: todayString })
      .populate({
        path: "user", // Customer ki details laayein
        select: "name phone_no", // Sirf naam aur phone number
      })
      .populate({
        path: "subscription", // Subscription ki details laayein
        select: "plan", // Sirf plan ki jaankari
      })
      .sort({ createdAt: -1 }); // Naye orders ko sabse upar dikhayein

    if (!deliveries) {
      return res
        .status(404)
        .send({
          success: false,
          message: "Aaj ke liye koi delivery nahi mili.",
        });
    }

    // 3. Saare deliveries ki complete list bhej dein
    res.status(200).send({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    console.error(
      "Admin ke liye aaj ki deliveries fetch karne mein error:",
      error
    );
    res.status(500).send({ success: false, message: "Server mein error hai." });
  }
};

export const markAsDeliveredController = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { deliveryId } = req.params;

    const delivery = await DeliveryModel.findOneAndUpdate(
      { _id: deliveryId, status: "Pending" }, // Sirf pending waale ko hi update karega
      { status: "Delivered" },
      { new: true, session }
    ).populate("subscription");

    if (!delivery) {
      await session.abortTransaction();
      session.endSession();
      // Iska matlab ya to delivery ID galat hai ya user ne button do baar daba diya
      return res.status(404).send({
        success: false,
        message: "Delivery not found or already processed.",
      });
    }

    const subscription = delivery.subscription;
    // 💡 SUDHAR YAHAN HAI: Yahaan par saaf-saaf check kiya jaa raha hai ki kya ye one-time plan tha
    if (subscription && subscription.plan.duration_days === 1) {
      console.log(
        `One-time subscription ${subscription._id} completed. Deactivating...`
      );
      await SubscriptionModel.updateOne(
        { _id: subscription._id },
        { is_active: false },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Delivery marked as complete.",
      delivery,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in markAsDeliveredController:", error);
    res.status(500).send({
      success: false,
      message: "Error updating delivery status",
      error,
    });
  }
};
