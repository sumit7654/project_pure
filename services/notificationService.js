// services/notificationService.js
import fetch from "node-fetch";

export async function sendPushNotification(expoPushTokens, title, body, data) {
  const messages = [];
  for (const token of expoPushTokens) {
    if (!token) continue; // Skip if token is invalid
    messages.push({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: data, // Optional data: e.g., { screen: 'Orders' }
    });
  }

  if (messages.length === 0) {
    console.log("No valid push tokens to send notifications to.");
    return;
  }

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });
    console.log(`Push notifications sent to ${messages.length} devices.`);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}
