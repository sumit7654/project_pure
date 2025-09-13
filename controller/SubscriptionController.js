import mongoose from "mongoose";
import SubscriptionModel from "../model/SubscriptionModel.js";
import { performDeduction } from "../services/deductionService.js";
import DeliveryModel from "../model/DeliveryModel.js";
import Walletmodel from "../model/Walletmodel.js";
// Naya subscription banane ke liye (Ye bilkul theek hai)
export const createSubscriptionController = async (req, res) => {
  // Start a new database session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, plan, quantity, startDate } = req.body;

    // 1. Validate input
    if (!userId || !plan || !quantity || !startDate) {
      throw new Error("User ID, plan, quantity, and start date are required.");
    }

    // 2. Find the user and their wallet within the transaction
    const user = await Usermodel.findById(userId).session(session);
    if (!user) {
      throw new Error("User not found.");
    }
    const wallet = await WalletModel.findOne({
      phone_no: user.phone_no,
    }).session(session);
    if (!wallet) {
      throw new Error("Wallet not found for this user.");
    }

    // 3. Calculate total price and subscription end date
    const pricePerDay = plan.price_per_day;
    const durationDays = plan.duration_days;
    const totalPrice = pricePerDay * quantity * durationDays;

    const validityEndDate = new Date(startDate);
    validityEndDate.setDate(validityEndDate.getDate() + durationDays);

    // 4. Check if the user has enough balance
    if (wallet.balance < totalPrice) {
      throw new Error("Insufficient wallet balance to subscribe.");
    }

    // 5. Deduct the amount from the wallet
    wallet.balance -= totalPrice;
    await wallet.save({ session });

    // 6. Create a transaction record for the deduction
    await TransactionModel.create(
      [
        {
          walletId: wallet._id,
          amount: totalPrice,
          type: "debit",
          status: "successful",
          description: `Subscription for ${plan.productName}`,
        },
      ],
      { session }
    );

    // 7. Create the new subscription document
    const newSubscription = (
      await SubscriptionModel.create(
        [
          {
            user: userId,
            phone_no: user.phone_no,
            plan: {
              productName: plan.productName,
              price_per_day: pricePerDay,
              quantity: quantity,
              duration_days: durationDays,
              delivery_type: plan.delivery_type || "Daily",
            },
            start_date: new Date(startDate),
            validity_end_date: validityEndDate,
            is_active: true,
            last_deduction_date: new Date(),
          },
        ],
        { session }
      )
    )[0];

    // 8. Handle Referral Reward Logic (if applicable)
    const userSubscriptionsCount = await SubscriptionModel.countDocuments({
      user: user._id,
    }).session(session);

    if (user.referredBy && userSubscriptionsCount === 1) {
      console.log(`Processing referral reward for user ${user.phone_no}...`);
      const referrer = await Usermodel.findOne({
        referralCode: user.referredBy,
      }).session(session);

      if (referrer) {
        const rewardAmount = 50; // Your reward amount

        // Reward the new user
        await WalletModel.findOneAndUpdate(
          { phone_no: user.phone_no },
          { $inc: { balance: rewardAmount } },
          { session }
        );
        await TransactionModel.create(
          [
            {
              walletId: wallet._id,
              amount: rewardAmount,
              type: "credit",
              status: "successful",
              description: "Referral bonus",
            },
          ],
          { session }
        );

        // Reward the referrer
        await WalletModel.findOneAndUpdate(
          { phone_no: referrer.phone_no },
          { $inc: { balance: rewardAmount } },
          { session }
        );

        // Important: Remove the code so it can't be used again for rewards
        user.referredBy = null;
        await user.save({ session });
        console.log("Referral reward processed successfully.");
      }
    }

    // If all steps above are successful, commit the transaction
    await session.commitTransaction();

    // Finally, send the success response
    res.status(201).send({
      success: true,
      message: "Subscription created successfully!",
      subscription: newSubscription,
    });
  } catch (error) {
    // If any error occurs at any step, abort the entire transaction
    await session.abortTransaction();

    console.error("CREATE SUBSCRIPTION FAILED:", error);
    res.status(500).send({
      success: false,
      message: error.message || "Failed to create subscription.",
    });
  } finally {
    // End the session in both success and failure cases
    session.endSession();
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
