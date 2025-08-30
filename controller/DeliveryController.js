// controllers/DeliveryController.js

import DeliveryModel from "../model/DeliveryModel.js";

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
    res
      .status(500)
      .send({
        success: false,
        message: "Error updating delivery status",
        error,
      });
  }
};
