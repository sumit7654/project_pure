import WalletModel from "../model/Walletmodel.js";
import TransactionModel from "../model/TransactionModel.js";
import NotificationModel from "../model/NotificationModel.js";
import ProductModel from "../model/ProductModel.js";
import { getTodayInKolkataString } from "../utils/dateHelper.js";
import DeliveryModel from "../model/DeliveryModel.js";

// Ye function ek subscription leta hai aur uske paise kaatta hai
export const performDeduction = async (subscription, session) => {
  // const today = new Date();
  // today.setHours(0, 0, 0, 0);

  try {
    const product = await ProductModel.findOne({
      id: subscription.plan.productId,
    }).session(session);

    const wallet = await WalletModel.findOne({
      phone_no: subscription.phone_no,
    }).session(session);

    if (!product || product.quantity < subscription.plan.quantity) {
      subscription.is_active = false;
      await subscription.save({ session });
      await NotificationModel.create(
        [
          {
            recipient: subscription.user,
            title: "Subscription Paused: Out of Stock",
            message: `Your ${subscription.plan.productName} subscription is paused as the product is out of stock.`,
            type: "subscription_paused",
            entityId: subscription._id,
          },
        ],
        { session }
      );
      throw new Error("Product out of stock");
    }

    if (!wallet || wallet.balance < subscription.plan.price_per_day) {
      console.log(
        `Deactivating subscription for ${subscription.phone_no} due to insufficient balance.`
      );
      subscription.is_active = false;
      await subscription.save({ session }); // ✅ FIX: Session ka istemal karein
      await NotificationModel.create(
        [
          {
            recipient: subscription.user,
            title: "Subscription Paused: Low Balance",
            message: `Your ${subscription.plan.productName} subscription has been paused due to low wallet balance. Please recharge.`,
            type: "subscription_paused",
            entityId: subscription._id,
          },
        ],
        { session }
      );
      throw new Error("Insufficient balance");
    }

    // Wallet se paise kaatein
    wallet.balance -= subscription.plan.price_per_day;
    product.quantity -= subscription.plan.quantity;
    subscription.last_deduction_date = new Date();

    await TransactionModel.create(
      [
        {
          walletId: wallet._id,
          amount: subscription.plan.price_per_day,
          type: "debit",
          status: "successful",
          description: `Daily delivery for ${subscription.plan.productName}`,
          razorpayPaymentId: `SUB_${subscription._id}_${today.getTime()}`,
        },
      ],
      { session } // ✅ FIX: Session ka istemal karein
    );

    const todayString = getTodayInKolkataString();
    await DeliveryModel.create(
      [
        {
          subscription: subscription._id,
          user: subscription.user._id, // ✅ SAHI FIX YAHAN HAI
          delivery_date: todayString,
          status: "Pending", // Shuruaati status pending hoga
        },
      ],
      { session }
    );

    await NotificationModel.create(
      [
        {
          recipient: subscription.user,
          title: "Order Confirmed",
          message: `Your delivery for ${subscription.plan.productName} is scheduled for today. Amount deducted: ₹${subscription.plan.price_per_day}`,
          type: "payment_successful",
          entityId: subscription._id,
        },
      ],
      { session } // ✅ FIX: Session ka istemal karein
    );

    // Subscription mein aaj ki tareekh update karein
    subscription.last_deduction_date = today;

    await wallet.save({ session });
    await product.save({ session });
    await subscription.save({ session });

    console.log(
      `Successfully deducted ₹${subscription.plan.price_per_day} from ${subscription.phone_no}.`
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
    throw err;
  }
};
