import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// GeoJSON location ke liye ek chhota schema
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number], // Format: [longitude, latitude]
    required: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone_no: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Default mein password na bhejein
    },
    // 💡 FIX: Yahaan par 'role' field joda gaya hai
    role: {
      type: String,
      enum: ["customer", "admin", "deliveryBoy"], // Sirf ye 3 values ho sakti hain
      default: "customer", // Naye user hamesha 'customer' honge
    },
    assignedPincodes: {
      type: [String],
      default: [],
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true, // Yeh 'null' values ko unique constraint se ignore karta hai
    },
    referredBy: {
      type: String, // Yahan us user ka referral code store hoga jisne refer kiya
    },
    // expoPushTokens: {
    //   type: [String],
    //   default: [],
    // },
    // +++ Yahaan Address ka poora structure hai +++
    address: {
      houseNumber: String,
      landmark: String,
      street: String,
      city: String,
      pincode: String,
      location: {
        type: pointSchema,
        index: "2dsphere", // Location-based search ke liye zaroori
      },
    },
  },
  {
    timestamps: true,
  }
);

// Password hash karne ke liye (agar pehle se nahi hai)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Password compare karne ke liye (agar pehle se nahi hai)
userSchema.methods.comparepassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
