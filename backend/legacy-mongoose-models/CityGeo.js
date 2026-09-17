const mongoose = require("mongoose");

const cityGeoSchema = new mongoose.Schema(
  {
    cityName: {
      type: String,
      required: true,
      trim: true,
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
  },
  { timestamps: true }
);

cityGeoSchema.index({ cityName: 1, countryCode: 1 }, { unique: true });
cityGeoSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("CityGeo", cityGeoSchema);
