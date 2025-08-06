import SubscriptionModel from "../model/SubscriptionModel.js";

// यह एक उदाहरण प्लान लिस्ट है, आप इसे अपने डेटाबेस में भी रख सकते हैं
const availablePlans = {
  "milk-1l": { name: "1 Litre Milk", price_per_day: 60 },
  "dahi-500g": { name: "500g Dahi", price_per_day: 35 },
};

export const createSubscriptionController = async (req, res) => {
  try {
    const { phone_no, plan_id, validity_in_days, skip_days } = req.body;

    if (!phone_no || !plan_id || !validity_in_days) {
      return res.status(400).send({ message: "Required fields are missing" });
    }

    const planDetails = availablePlans[plan_id];
    if (!planDetails) {
      return res.status(404).send({ message: "Plan not found" });
    }

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + parseInt(validity_in_days, 10));

    const newSubscription = new SubscriptionModel({
      phone_no,
      plan: planDetails,
      validity_start_date: today,
      validity_end_date: endDate,
      skip_days: skip_days || [], // अगर skip_days नहीं भेजे तो खाली array
    });

    await newSubscription.save();

    res.status(201).send({
      success: true,
      message: "Subscription created successfully!",
      subscription: newSubscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};
