import mongoose from "mongoose";
import SubscriptionModel from "../model/SubscriptionModel.js";
import { performDeduction } from "../services/deductionService.js";
import DeliveryModel from "../model/DeliveryModel.js";
import Usermodel from "../model/Usermodel.js"; // <-- ✅ Ise jodein
import TransactionModel from "../model/TransactionModel.js";

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
        `Chetaavni: Referrer ${referrer._id} ke paas walletId nahi tha. Abhi banaya ja raha hai...`
      );

      const newWallet = new WalletModel({
        user: referrer._id,
        balance: referrer.walletBalance || 0,
      });
      const savedWallet = await newWallet.save({ session });

      await Usermodel.findByIdAndUpdate(
        referrer._id,
        { $set: { walletId: savedWallet._id } },
        { session }
      );

      referrer.walletId = savedWallet._id;

      console.log(`Safalta: Naya wallet ban gaya aur user se link ho gaya.`);
    }
    // +++ SELF-HEALING LOGIC KHATM +++

    const REFERRAL_BONUS = 50;
    await Usermodel.findByIdAndUpdate(
      referrer._id,
      { $inc: { walletBalance: REFERRAL_BONUS } },
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
      `✅ SAFALTA: ${referrer.name} ko ${REFERRAL_BONUS} ka referral bonus mil gaya!`
    );
  } catch (error) {
    console.error("❌ REFERRAL REWARD DENE MEIN ERROR:", error);
    throw new Error("Could not process referral reward.");
  }
};
// Naya subscription banane ke liye (Ye bilkul theek hai)
export const createSubscriptionController = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { phone_no, plan, startDate, userId } = req.body;

    if (!phone_no || !plan || !startDate || !userId) {
      throw new Error("Missing required fields for subscription.");
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + plan.duration_days);

    const newSubscription = new SubscriptionModel({
      user: userId,
      phone_no,
      plan,
      start_date: start,
      validity_end_date: end,
    });
    await newSubscription.save({ session });

    // 💡 SUDHAR YAHAN HAI: Paise kaatne ka kaam bhi transaction ke andar hoga
    await performDeduction(newSubscription, session);

    // 💡 SUDHAR YAHAN HAI: Pehli delivery bhi transaction ke andar hi banegi
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
  }
};

// 💡 FIX: Ye function ab ek specific subscription ko uski ID se update karega
export const updatePausedDatesController = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { paused_dates } = req.body;

    if (!Array.isArray(paused_dates)) {
      return res
        .status(400)
        .send({ message: "paused_dates must be an array." });
    }

    const subscription = await SubscriptionModel.findById(subscriptionId);
    if (!subscription) {
      return res
        .status(404)
        .send({ success: false, message: "Subscription not found." });
    }

    const oldPausedCount = subscription.paused_dates.length;
    const newPausedCount = paused_dates.length;
    let newValidityEndDate = new Date(subscription.validity_end_date);

    // 💡 SUDHAR YAHAN HAI: Validity update karne ka saaf-suthra logic
    const dateDifference = newPausedCount - oldPausedCount;
    newValidityEndDate.setDate(newValidityEndDate.getDate() + dateDifference);

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
