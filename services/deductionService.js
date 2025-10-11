import WalletModel from "../model/Walletmodel.js";
import TransactionModel from "../model/TransactionModel.js";
import NotificationModel from "../model/NotificationModel.js";
import ProductModel from "../model/ProductModel.js";
import { getTodayInKolkataString } from "../utils/dateHelper.js";
import DeliveryModel from "../model/DeliveryModel.js";

// Ye function ek subscription leta hai aur uske paise kaatta hai
export const performDeduction = async (subscription, session) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const productIdFromSubscription = subscription.plan.productId;
    console.log("-----------------------------------------");
    console.log(`Processing subscription for phone: ${subscription.phone_no}`);
    console.log(
      `Searching for product with custom ID: ${productIdFromSubscription}`
    );

    const product = await ProductModel.findOne({
      id: productIdFromSubscription,
    }).session(session);

    if (!product) {
      console.error(
        `🔴 CRITICAL: Product NOT FOUND in database for ID: ${productIdFromSubscription}`
      );
      throw new Error("Product not found in database.");
    }

    console.log(`Product Found: ${product.name}`);
    console.log(`==> Available Quantity in DB: ${product.quantity}`);
    console.log(`==> Required Quantity for Sub: ${subscription.plan.quantity}`);
    console.log("-----------------------------------------");
    // ▲▲▲ YAHAN TAK ▲▲▲
    // const product = await ProductModel.findOne({
    //   id: subscription.plan.productId,
    // }).session(session);

    const wallet = await WalletModel.findOne({
      phone_no: subscription.phone_no,
    }).session(session);

    console.log("Wallet in deduction service :", wallet);

    if (!product || product.quantity < subscription.plan.quantity) {
      subscription.is_active = false;
      console.log(
        "Out of stock hai yaha aur notification show nhi ho rha hai "
      );
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
    await subscription.save({ session });

    if (!wallet || wallet.balance < subscription.plan.price_per_day) {
      console.log(
        `Deactivating subscription for ${subscription.phone_no} due to insufficient balance.`
      );
      subscription.is_active = false;
      console.log("Subscription is active or not : ", subscription.is_active);
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
    await subscription.save({ session }); // ✅ FIX: Session ka istemal karein

    console.log("############# check this log  ################");
    console.log(" --Before order Wallet : ", wallet.balance);
    console.log("-- Before order quantity : ", product.quantity);
    console.log("-- before plan price day : ", subscription.plan.price_per_day);
    console.log("-- before plan Quantity : ", subscription.plan.quantity);
    // Wallet se paise kaatein
    wallet.balance -= subscription.plan.price_per_day;
    product.quantity -= subscription.plan.quantity;
    subscription.last_deduction_date = new Date();

    console.log("-- After order Wallet : ", wallet.balance);
    console.log("-- After order quantity : ", product.quantity);

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

    console.log("User id throught the subcription : ", subscription.user._id);

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
