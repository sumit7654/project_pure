// controllers/RouteController.js

import Usermodel from "../model/Usermodel.js";
import DeliveryModel from "../model/DeliveryModel.js";
import axios from "axios";

// Apne store/warehouse ka location yahaan daalein
const STORE_LOCATION = "25.5941,85.1376"; // Example: Patna, Bihar

export const getOptimizedRouteController = async (req, res) => {
  try {
    const { deliveryBoyId } = req.params;
    const deliveryBoy = await Usermodel.findById(deliveryBoyId);

    if (!deliveryBoy || deliveryBoy.role !== "deliveryBoy") {
      return res.status(404).send({ message: "Delivery boy not found." });
    }

    const todayString = new Date().toISOString().split("T")[0];
    const todaysDeliveries = await DeliveryModel.find({
      delivery_date: todayString,
      status: "Pending",
    }).populate({
      path: "user",
      select: "address",
      match: { "address.pincode": { $in: deliveryBoy.assignedPincodes } },
    });

    const waypoints = todaysDeliveries
      .filter((d) => d.user && d.user.address?.location?.coordinates)
      .map(
        (d) =>
          `${d.user.address.location.coordinates[1]},${d.user.address.location.coordinates[0]}`
      ); // "lat,lng" format

    if (waypoints.length === 0) {
      return res.json({ success: true, route: null, waypoints: [] });
    }

    // Google Maps Directions API ko call karein
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: STORE_LOCATION,
          destination: STORE_LOCATION,
          waypoints: `optimize:true|${waypoints.join("|")}`,
          key: process.env.GOOGLE_MAPS_API_KEY, // Apni .env file mein API key daalein
        },
      }
    );

    if (response.data.status !== "OK") {
      throw new Error(response.data.error_message || "Google Maps API error");
    }

    const route = response.data.routes[0];
    const encodedPolyline = route.overview_polyline.points;

    res.json({
      success: true,
      route: encodedPolyline,
      waypoints: route.legs.map((leg) => ({
        address: leg.end_address,
        location: leg.end_location,
      })),
    });
  } catch (error) {
    console.error("Error creating optimized route:", error);
    res.status(500).send({ success: false, message: "Error creating route" });
  }
};
