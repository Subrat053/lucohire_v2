const mongoose = require("mongoose");

const geoNamesCitySchema = new mongoose.Schema(
  {
    geonameId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    asciiName: {
      type: String,
      trim: true,
    },
    alternateNames: {
      type: [String],
      default: [],
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    admin1Code: {
      type: String,
      trim: true,
    },
    admin1Name: {
      type: String,
      trim: true,
      index: true,
    },
    admin2Code: {
      type: String,
      trim: true,
    },
    population: {
      type: Number,
      default: 0,
    },
    timezone: {
      type: String,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    searchText: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

geoNamesCitySchema.index({ location: "2dsphere" });
geoNamesCitySchema.index({ name: 1 });
geoNamesCitySchema.index({ countryCode: 1, name: 1 });

module.exports = mongoose.model("GeoNamesCity", geoNamesCitySchema);
