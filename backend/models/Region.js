const mongoose = require("mongoose");

const regionSchema = new mongoose.Schema(
  {
    noc: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
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

module.exports = mongoose.models.Region || mongoose.model("Region", regionSchema);
