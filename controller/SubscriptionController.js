// backend/controllers/SubscriptionController.js

import SubscriptionModel from "../models/SubscriptionModel.js";

export const createSubscriptionController = async (req, res) => {
  try {
    console.log(
      "--- Received request to create subscription with body: ---",
      req.body
    );
    // 1. We now get the complete plan object from the request body
    const { phone_no, planDetails, validity_in_days, skip_days } = req.body;
    console.log(req.body);

    // Basic validation
    if (!phone_no || !planDetails || !validity_in_days) {
      return res.status(400).send({ message: "Required fields are missing" });
    }

    if (!planDetails.name || !planDetails.price_per_day) {
      return res
        .status(400)
        .send({ message: "Plan details (name, price) are required." });
    }

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + parseInt(validity_in_days, 10));

    // 2. We use the planDetails object directly to create the subscription
    const newSubscription = new SubscriptionModel({
      phone_no,
      plan: {
        name: planDetails.name,
        price_per_day: planDetails.price_per_day,
      },
      validity_start_date: today,
      validity_end_date: endDate,
      skip_days: skip_days || [],
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
