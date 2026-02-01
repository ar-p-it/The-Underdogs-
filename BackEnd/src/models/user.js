const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address");
        }
      },
    },

    password: {
      type: String,
      required: true,
    },

    age: {
      type: Number,
      min: 18,
    },

    gender: {
      type: String,
      enum: ["male", "female", "others"],
      required: true,
    },

    photoUrl: {
      type: String,
      default: "https://geographyandyou.com/images/user-profile.png",
      validate(value) {
        if (!validator.isURL(value)) {
          throw new Error("Invalid photo URL");
        }
      },
    },

    about: {
      type: String,
      default: "Hey there 👋 I am using DevTinder",
      maxlength: 300,
    },

    interests: {
      type: [String],
      default: [],
    },

    location: {
      city: String,
      country: String,
    },

    lookingFor: {
      type: String,
      enum: ["dating", "friendship", "serious"],
      default: "dating",
    },

    height: {
      type: Number, // cm
    },

    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
