// services/notifications.js
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://project-pure.onrender.com";

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    alert("Failed to get push token for push notification!");
    return;
  }

  try {
    // This is your Project ID from app.json
    const projectId = "ef0750a4-a11e-4411-a573-b89c771fe054";
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    console.error("Failed to get push token", e);
  }

  if (token) {
    try {
      const userDataString = await AsyncStorage.getItem("user"); // Use 'user' for customers
      if (userDataString) {
        const user = JSON.parse(userDataString);
        await axios.post(`${BASE_URL}/api/auth/save-push-token`, {
          userId: user._id,
          token: token,
        });
      }
    } catch (error) {
      console.error("Could not save push token to server", error);
    }
  }

  return token;
}
