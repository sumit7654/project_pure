import mongoose from "mongoose";
import SubscriptionModel from "../model/SubscriptionModel.js";
import { performDeduction } from "../services/deductionService.js";
import DeliveryModel from "../model/DeliveryModel.js";
import Usermodel from "../model/Usermodel.js"; // <-- ✅ Ise jodein
import TransactionModel from "../model/TransactionModel.js";
import WalletModel from "./../model/Walletmodel.js"; // <-- ✅ YAHAN IMPORT KAREIN

// =================================================================================
// =================== REFERRAL REWARD LOGIC (HELPER FUNCTION) =====================
// =================================================================================
const processReferralReward = async (newUserId, session) => {
  try {
    const userOrderCount = await SubscriptionModel.countDocuments({
      user: newUserId,
    }).session(session);
    if (userOrderCount > 1) {
      console.log(
        `User ${newUserId} ka pehla order nahi hai. Koi reward nahi.`
      );
      return;
    }

    const newUser = await Usermodel.findById(newUserId).session(session);
    if (!newUser || !newUser.referredBy) {
      console.log(`User ${newUserId} ne koi referral code use nahi kiya.`);
      return;
    }

    const referrer = await Usermodel.findOne({
      referralCode: newUser.referredBy,
    }).session(session);
    if (!referrer) {
      console.log(`Referrer jiska code ${newUser.referredBy} hai, nahi mila.`);
      return;
    }

    // +++ ✅ SELF-HEALING LOGIC YAHAN HAI +++
    // Check karein ki referrer ke paas walletId hai ya nahi
    if (!referrer.walletId) {
      console.warn(
        `Warning: Referrer ${referrer._id} don't have wallet id. its now creating...`
      );
      let existingWallet;
      existingWallet = await WalletModel.findOne({
        phone_no: referrer.phone_no,
      }).session(session);

      // Step 2: Agar wallet nahi mila, tabhi naya banao
      if (!existingWallet) {
        console.log(
          `there is no wallet. Referrer ke liye naya wallet banaya ja raha hai...`
        );
        const newWallet = new WalletModel({
          phone_no: referrer.phone_no,
          balance: 0,
        });
        existingWallet = await newWallet.save({ session });
      } else {
        console.log(`wallet already exist.. connecting with user ...`);
      }
      await Usermodel.findByIdAndUpdate(
        referrer._id,
        { $set: { walletId: existingWallet._id } },
        { session }
      );

      referrer.walletId = existingWallet._id;

      console.log(
        `Success: new wallet are generated .. its connecting with user ...`
      );
    }

    // +++ SELF-HEALING LOGIC KHATM +++

    const REFERRAL_BONUS = 50;
    await WalletModel.findByIdAndUpdate(
      referrer.walletId,
      { $inc: { balance: REFERRAL_BONUS } },
      { session }
    );

    await TransactionModel.create(
      [
        {
          walletId: referrer.walletId, // Ab yeh hamesha milega
          amount: REFERRAL_BONUS,
          type: "credit",
          status: "successful",
          description: `Referral bonus for inviting ${newUser.name}`,
        },
      ],
      { session }
    );

    console.log(
      `✅success: ${referrer.name} get ${REFERRAL_BONUS} for referal bonus`
    );
  } catch (error) {
    console.error("There is error in sending referal award:", error);
    throw new Error("Could not process referral reward.");
  }
};
// Naya subscription banane ke liye (Ye bilkul theek hai)
export const createSubscriptionController = async (req, res) => {
  const { phone_no, plan, startDate, userId } = req.body;
  try {
    if (!phone_no || !plan || !startDate || !userId) {
      throw new Error("Missing required fields for subscription.");
    }

    const user = await Usermodel.findById(userId);

    console.log("user is : ", user);
    if (!user || !user.walletId) {
      return res.status(404).send({
        success: false,
        message: "User or associated wallet not found.",
      });
    }
    const wallet = await WalletModel.findById(user.walletId);
    console.log("wallet id is : ", wallet);

    if (!wallet) {
      return res
        .status(404)
        .send({ success: false, message: "Wallet not found for this user." });
    }
    // Yahan check karo ki paise hain ya nahi
    if (wallet.balance < plan.price_per_day) {
      return res.status(402).send({
        // 402 Payment Required ek aacha status code hai iske liye
        success: false,
        message: `Insufficient balance. You need ₹${plan.price_per_day} but you only have ₹${wallet.balance}.`,
      });
    }
  } catch (error) {
    console.error("Error during pre-check:", error);
    return res.status(500).send({
      success: false,
      message: "Error verifying wallet balance.",
      error: error.message,
    });
  }

  // Step 3: Ab jab sab theek hai, tab hi transaction shuru karo
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const start = new Date(startDate);
    // const end = new Date(start);
    // end.setDate(start.getDate() + plan.duration_days - 1);

    // ▼▼▼ YAHAN BADLAAV HAI ▼▼▼
    let validityEndDate = null; // Default null rakho

    // Sirf 'One-time' plan ke liye end date set karo
    if (plan.delivery_type === "One-time") {
      const end = new Date(start);
      end.setDate(start.getDate() + 1); // Ek din baad khatam
      validityEndDate = end;
    }

    const newSubscription = new SubscriptionModel({
      user: userId,
      phone_no,
      plan,
      start_date: start,
      validity_end_date: validityEndDate,
      is_active: true, // Hamesha active shuru hoga
    });
    await newSubscription.save({ session });

    // Paise kaatne ka kaam bhi transaction ke andar hoga
    await performDeduction(newSubscription, session);

    //  Pehli delivery bhi transaction ke andar hi banegi
    const startDateString = start.toISOString().split("T")[0];
    await DeliveryModel.create(
      [
        {
          subscription: newSubscription._id,
          user: userId,
          delivery_date: startDateString,
        },
      ],
      { session }
    );

    // Yeh transaction ke commit hone se theek pehle hoga
    await processReferralReward(userId, session);
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Subscription created and first delivery scheduled.",
      subscription: newSubscription,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in createSubscriptionController:", error);
    res.status(500).send({
      success: false,
      message: "Error creating subscription",
      error: error.message,
    });
  } finally {
    // Session ko hamesha end karo
    session.endSession();
  }
};

//  Ye function ab ek specific subscription ko uski ID se update karega
export const updatePausedDatesController = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { paused_dates } = req.body;

    if (!Array.isArray(paused_dates)) {
      return res
        .status(400)
        .send({ message: "paused_dates must be an array." });
    }

    const sanitizedDates = paused_dates.map(
      (date) => new Date(date).toISOString().split("T")[0]
    );

    const subscription = await SubscriptionModel.findById(subscriptionId);
    if (!subscription) {
      return res
        .status(404)
        .send({ success: false, message: "Subscription not found." });
    }

    const oldPausedCount = subscription.paused_dates.length;
    const newPausedCount = paused_dates.length;
    let newValidityEndDate = new Date(subscription.validity_end_date);

    //  Validity update karne ka saaf-suthra logic
    const dateDifference = newPausedCount - oldPausedCount;
    newValidityEndDate.setDate(newValidityEndDate.getDate() + dateDifference);

    const updatedSubscription = await SubscriptionModel.findByIdAndUpdate(
      subscriptionId,
      {
        paused_dates: sanitizedDates,
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

// User ke saare active subscriptions laane ke liye
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

// ✅ ADD THIS NEW FUNCTION
export const getAllSubscriptionsController = async (req, res) => {
  try {
    const subscriptions = await SubscriptionModel.find({})
      .populate("user", "name phone_no") // Get the customer's name and phone
      .sort({ createdAt: -1 }); // Show the newest subscriptions first

    res.status(200).send({ success: true, subscriptions });
  } catch (error) {
    console.error("Error fetching all subscriptions:", error);
    res
      .status(500)
      .send({ success: false, message: "Error fetching all subscriptions" });
  }
};

// export const cancelSubscriptionsController = async (req, res) => {
//   try {
//     const { subscriptionId } = req.params;

//     console.log("Cancel request for subscription:", subscriptionId);

//     // Find subscription
//     const subscription = await SubscriptionModel.findById(subscriptionId);
//     console.log("Subscription ", subscription);
//     if (!subscription) {
//       return res
//         .status(404)
//         .send({ success: false, message: "Subscription not found." });
//     }

//     // Update subscription status
//     subscription.is_active = false; // 👈 Make sure this field exists in your model
//     subscription.cancelledAt = new Date(); // Optional: track cancel time
//     await subscription.save();

//     console.log("Subscription cancelled successfully");
//     return res
//       .status(200)
//       .send({ success: true, message: "Subscription cancelled successfully." });
//   } catch (error) {
//     console.error("Error in deactivating subscription:", error);
//     return res
//       .status(500)
//       .send({ success: false, message: "Error cancelling subscription" });
//   }
// };

export const cancelSubscriptionController = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body; // Hum body se reason lenge

    if (!reason) {
      return res
        .status(400)
        .send({ success: false, message: "Cancellation reason is required." });
    }

    const subscription = await SubscriptionModel.findById(subscriptionId);
    if (!subscription) {
      return res
        .status(404)
        .send({ success: false, message: "Subscription not found." });
    }

    subscription.is_active = false;
    subscription.cancellationReason = reason; // Reason ko save karein
    await subscription.save();

    res
      .status(200)
      .send({ success: true, message: "Subscription cancelled successfully." });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res
      .status(500)
      .send({ success: false, message: "Error cancelling subscription." });
  }
};
