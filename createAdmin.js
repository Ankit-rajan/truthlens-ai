require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    const existing = await User.findOne({
      email: process.env.ADMIN_EMAIL,
    });

    if (existing) {
      console.log("✅ Admin already exists.");
      process.exit();
    }

    await User.create({
      name: "Administrator",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
      isVerified: true,
    });

    console.log("✅ Admin created successfully.");
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });