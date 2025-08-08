import mongoose from "mongoose";
import bcrypt from "bcryptjs"; // 👈 पासवर्ड हैशिंग के लिए इसे इम्पोर्ट करें

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const Usermodel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone_no: {
      type: Number,
      required: true,
      unique: true, // 👈 फ़ोन नंबर यूनिक होना चाहिए
    },
    password: {
      type: String,
      required: true,
      select: false, // 👈 डिफ़ॉल्ट रूप से पासवर्ड न भेजें
    },
    // +++ नया एड्रेस सेक्शन +++
    address: {
      houseNumber: String,
      landmark: String,
      location: {
        type: pointSchema,
        index: "2dsphere", // 👈 जियो-लोकेशन क्वेरी के लिए बहुत ज़रूरी
      },
    },
  },
  {
    timestamps: true,
  }
);

// +++ पासवर्ड हैश करने के लिए +++
Usermodel.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// +++ पासवर्ड तुलना करने के लिए +++
Usermodel.methods.comparepassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", Usermodel);
