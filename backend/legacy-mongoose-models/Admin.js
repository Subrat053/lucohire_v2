const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["admin"], default: "admin" },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
