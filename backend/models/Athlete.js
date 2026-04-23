const mongoose = require("mongoose");

const athleteSchema = new mongoose.Schema(
  {
    athleteId: {
      type: Number,
      index: true,
    },
    sourceRowNumber: {
      type: Number,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sex: {
      type: String,
      trim: true,
      default: "",
    },
    age: Number,
    height: Number,
    weight: Number,
    team: {
      type: String,
      trim: true,
      default: "",
    },
    noc: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    region: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    games: {
      type: String,
      trim: true,
      default: "",
    },
    year: {
      type: Number,
      index: true,
    },
    season: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    sport: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    event: {
      type: String,
      trim: true,
      default: "",
    },
    medal: {
      type: String,
      trim: true,
      default: "None",
      index: true,
    },
    importBatchId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

athleteSchema.index({ name: "text", team: "text", event: "text" });
athleteSchema.index({ sport: 1, medal: 1, year: 1, region: 1 });

module.exports = mongoose.models.Athlete || mongoose.model("Athlete", athleteSchema);
