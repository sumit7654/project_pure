import WalletModel from "../model/Walletmodel.js";
import TransactionModel from "../model/TransactionModel.js";
import NotificationModel from "../model/NotificationModel.js";

// Ye function ek subscription leta hai aur uske paise kaatta hai
export const performDeduction = async (subscription) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const wallet = await WalletModel.findOne({
      phone_no: subscription.phone_no,
    });

    if (!wallet || wallet.balance < subscription.plan.price_per_day) {
      console.log(
        `Deactivating subscription for ${subscription.phone_no} due to insufficient balance.`
      );
      subscription.is_active = false;
      await subscription.save();
      await NotificationModel.create(
        [
          {
            recipient: subscription.user,
            title: "Subscription Paused",
            message: `Your ${subscription.plan.productName} subscription has been paused due to low wallet balance. Please recharge to resume.`,
            type: "subscription_paused",
            entityId: subscription._id,
          },
        ],
        { session }
      );
      return { success: false, message: "Insufficient balance" };
    }

    // Wallet se paise kaatein
    wallet.balance -= subscription.plan.price_per_day;

    // Transaction record banayein
    await TransactionModel.create({
      walletId: wallet._id,
      amount: subscription.plan.price_per_day,
      type: "debit",
      status: "successful",
      description: `Daily subscription for ${subscription.plan.productName}`,
      razorpayPaymentId: `SUB_${subscription._id}_${today.getTime()}`,
    });
    const startDateString = start.toISOString().split("T")[0];

    await DeliveryModel.create(
      [
        {
          subscription: subscription._id,
          user: userId,
          delivery_date: startDateString,
          status: "Pending", // Shuruaati status pending hoga
        },
      ],
      { session }
    );

    // Subscription mein aaj ki tareekh update karein
    subscription.last_deduction_date = today;

    await wallet.save();
    await subscription.save();

    console.log(
      `Successfully deducted ₹${subscription.plan.price_per_day} from ${subscription.phone_no}.`
    );
    await NotificationModel.create(
      [
        {
          recipient: subscription.user,
          title: "Order confirmed",
          message: `Your ${subscription.plan.productName} subscription has been scheduled and money are deduct according to your plan`,
          type: "order confirmed",
          entityId: subscription._id,
        },
      ],
      { session }
    );
    return {
      success: true,
      message: "Deduction successful and today order created successfully",
    };
  } catch (err) {
    console.error(
      `Failed to process deduction for ${subscription.phone_no}:`,
      err
    );
    return { success: false, message: "Deduction failed due to an error" };
  }
};
