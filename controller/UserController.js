import React from "react";

import Usermodel from "./../model/Usermodel.js";

export const Registercontroller = async (req, res) => {
  const { name, phone_no, password, confirmpassword } = req.body;

  if (!name) {
    return res.status(200).send({
      message: "Name is required",
      success: false,
    });
  }
  if (!phone_no) {
    return res.status(200).send({
      message: "Phone number is required",
      success: false,
    });
  }
  if (!password) {
    return res.status(200).send({
      message: "password is registered",
      success: false,
    });
  }
  if (!confirmpassword) {
    return res.status(200).send({
      message: "confirm password is required",
      success: false,
    });
  }

  if (password !== confirmpassword) {
    return res.status(200).send({
      message: "confirm password is not same as password",
      success: false,
    });
  }
  const exitinguser = await Usermodel.findOne({ phone_no });

  if (exitinguser) {
    return res.status(200).send({
      message: "User already registered",
      success: false,
    });
  }

  const user = await Usermodel.create({
    name,
    phone_no,
    password,
  });
  res.status(200).send({
    message: "Successfully Registered",
    success: true,
    user: {
      name: user.name,
      phone_no: user.phone_no,
      password: user.password,
      confirmpassword: user.confirmpassword,
    },
  });
};

// ################################ LOGIN CONTROLLER ####################################

export const Logincontroller = async (req, res) => {
  const { phone_no, password } = req.body;

  if (!phone_no) {
    return res.status(400).send({
      message: "phone number is required",
      success: false,
    });
  }
  if (!password) {
    return res.status(400).send({
      message: "password is required",
      success: false,
    });
  }

  const user = await Usermodel.findOne({ phone_no }).select("+password");
  if (!user) {
    return res.status(400).send({
      message: "Invalid Credential",
      success: false,
    });
  }

  const isMatch = await user.comparepassword(password);
  if (!isMatch) {
    return res.status(400).send({
      message: "Invalid Credential",
      success: false,
    });
  }
  res.status(200).json({
    success: true,
    message: "Login successfully",
    user,
  });
};
