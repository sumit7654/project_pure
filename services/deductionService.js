import WalletModel from "../model/Walletmodel.js";
import TransactionModel from "../model/TransactionModel.js";

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
      description: `Daily subscription for ${subscription.plan.name}`,
      razorpayPaymentId: `SUB_${subscription._id}_${today.getTime()}`,
    });

    // Subscription mein aaj ki tareekh update karein
    subscription.last_deduction_date = today;

    await wallet.save();
    await subscription.save();

    console.log(
      `Successfully deducted ₹${subscription.plan.price_per_day} from ${subscription.phone_no}.`
    );
    return { success: true, message: "Deduction successful" };
  } catch (err) {
    console.error(
      `Failed to process deduction for ${subscription.phone_no}:`,
      err
    );
    return { success: false, message: "Deduction failed due to an error" };
  }
};
