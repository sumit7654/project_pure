import mongoose from "mongoose";

const Usermodel = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone_no: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

Usermodel.methods.comparepassword = function (enteredPassword) {
  return this.password === enteredPassword;
};
export default mongoose.model("User", Usermodel);
