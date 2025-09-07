import Usermodel from "../model/Usermodel.js";
import DeliveryModel from "../model/DeliveryModel.js";

// 💡 SUDHAR YAHAN HAI: Ye function ab sirf delivery locations laayega, route nahi banayega
export const getDeliveryLocationsController = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const deliveryBoy = await Usermodel.findById(deliveryBoyId);

    if (
      !deliveryBoy ||
      !deliveryBoy.assignedPincodes ||
      deliveryBoy.assignedPincodes.length === 0
    ) {
      return res.status(404).send({
        success: false,
        message: "Delivery boy not found or has no assigned pincodes.",
      });
    }

    const todayString = new Date().toISOString().split("T")[0];

    const todaysDeliveries = await DeliveryModel.find({
      delivery_date: todayString,
      status: "Pending",
    }).populate({
      path: "user",
      select: "name address",
      match: { "address.pincode": { $in: deliveryBoy.assignedPincodes } },
    });

    const locations = todaysDeliveries
      .filter((d) => d.user && d.user.address?.location?.coordinates)
      .map((d) => ({
        _id: d._id,
        user_name: d.user.name,
        pincode: d.user.address.pincode,
        coords: {
          latitude: d.user.address.location.coordinates[1],
          longitude: d.user.address.location.coordinates[0],
        },
      }));

    res.status(200).json({
      success: true,
      locations: locations,
    });
  } catch (error) {
    console.error("Error fetching delivery locations:", error);
    res
      .status(500)
      .send({ success: false, message: "Error fetching locations" });
  }
};
