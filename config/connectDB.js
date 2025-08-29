import mongoose, { connect } from "mongoose";

const connectDB = async () => {
  try {
    const conn = mongoose.connect(process.env.MONGO_LOCAL_URL);
    console.log("MongoDB Connected Successfully".bgMagenta);
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;
