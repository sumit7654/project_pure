// controllers/DeliveryController.js

import DeliveryModel from "../model/DeliveryModel.js";

export const createDeliveryController = async (req, res) => {
  try {
    const { subscriptionId, userId, deliveryDate } = req.body;

    const delivery = new DeliveryModel({
      subscription: subscriptionId,
      user: userId,
      delivery_date: deliveryDate, // "YYYY-MM-DD"
      // status default: "Pending"
    });

    await delivery.save();

    res.status(201).json({
      success: true,
      message: "Delivery created successfully",
      delivery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating delivery",
      error,
    });
  }
};

export const markAsDeliveredController = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await DeliveryModel.findByIdAndUpdate(
      deliveryId,
      { status: "Delivered" },
      { new: true }
    );

    if (!delivery) {
      return res
        .status(404)
        .send({ success: false, message: "Delivery not found." });
    }

    res.status(200).json({
      success: true,
      message: "Delivery marked as complete.",
      delivery,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error updating delivery status",
      error,
    });
  }
};
