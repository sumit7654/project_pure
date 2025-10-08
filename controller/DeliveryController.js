// controllers/DeliveryController.js
import mongoose from "mongoose";
import DeliveryModel from "../model/DeliveryModel.js";
import SubscriptionModel from "../model/SubscriptionModel.js";
import { getTodayInKolkataString } from "../utils/dateHelper.js";

export const getTodaysDeliveriesForAdminController = async (req, res) => {
  try {
    // 1. Apne timezone ke anusaar aaj ki sahi tarikh nikaalein
    const todayString = getTodayInKolkataString();

    // 2. Sirf aaj ki tarikh waale saare deliveries dhoondhein
    const deliveries = await DeliveryModel.find({ delivery_date: todayString })
      .populate({
        path: "user", // Customer ki details laayein
        select: "name phone_no address", // Sirf naam aur phone number
      })
      .populate({
        path: "subscription", // Subscription ki details laayein
        populate: {
          path: "plan",
          model: "Plan",
        }, // Sirf plan ki jaankari
      })
      .sort({ createdAt: -1 }); // Naye orders ko sabse upar dikhayein

    if (!deliveries) {
      return res.status(404).send({
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

// ✅ YEH FUNCTION UPDATE KIYA GAYA HAI
// export const getTodaysDeliveryForUserController = async (req, res) => {
//   console.log(
//     "\n--- [BACKEND] 1. Request received for a user's today delivery ---"
//   );
//   try {
//     const { userId } = req.params;
//     console.log(`--- [BACKEND] 2. User ID received: ${userId} ---`);

//     const todayString = getTodayInKolkataString();
//     console.log(
//       `--- [BACKEND] 3. Searching for deliveries for date: ${todayString} ---`
//     );

//     const delivery = await DeliveryModel.findOne({
//       user: userId,
//       delivery_date: todayString,
//     }).populate({
//       path: "subscription",
//       select: "plan", // Sirf plan ki details laayein
//     });

//     if (!delivery) {
//       console.log(
//         "--- [BACKEND] 4a. No delivery found for this user today. ---"
//       );
//       return res
//         .status(404)
//         .send({ success: false, message: "No delivery scheduled for today." });
//     }

//     console.log("--- [BACKEND] 4b. Delivery found! Sending to app. ---");
//     res.status(200).send({ success: true, delivery });
//   } catch (error) {
//     console.error(
//       "--- !!! [BACKEND] CRITICAL ERROR in getTodaysDeliveryForUserController !!! ---",
//       error
//     );
//     res
//       .status(500)
//       .send({
//         success: false,
//         message: "Server error while fetching delivery status.",
//       });
//   }
// };

export const getTodaysDeliveryForUserController = async (req, res) => {
  try {
    const { userId } = req.params;
    const todayString = getTodayInKolkataString();
    console.log("User is", userId);

    console.log("Today string is : ", todayString);

    // ✅ FIX: `find` ka istemal karein taaki saari matching deliveries milein
    const deliveries = await DeliveryModel.find({
      user: userId,
      delivery_date: todayString,
    }).populate("subscription");
    console.log("Deliveries= ", deliveries);

    if (!deliveries || deliveries.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No deliveries scheduled for today.",
      });
    }

    res.status(200).send({ success: true, deliveries: deliveries }); // 'deliveries' (plural) bhejein
  } catch (error) {
    res.status(500).send({ success: false, message: "Server error." });
  }
};
