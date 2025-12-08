const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher", "hod"], required: true },

  // Only required for students
  rollNumber: {
    type: String,
    unique: true,
    sparse: true   // ✅ allows multiple docs with "null" or "" values
  },

    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    },


    resetOtp: {
      type:String
    },

    resetOtpExpires: {
      type: Date
    }
});

module.exports = mongoose.model("User", userSchema);
