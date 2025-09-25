// utils/dateHelper.js
export const getTodayInKolkataString = () => {
  const now = new Date();
  const year = now.toLocaleString("en-US", {
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const month = now.toLocaleString("en-US", {
    month: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const day = now.toLocaleString("en-US", {
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return `${year}-${month}-${day}`;
};
// server me add kiye hai aur usercontroller
