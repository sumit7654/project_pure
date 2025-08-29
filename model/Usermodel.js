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
      type: Number,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Default mein password na bhejein
    },
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
