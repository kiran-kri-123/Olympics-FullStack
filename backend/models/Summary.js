const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    totalRecords: Number,
    uniqueAthletes: Number,
    countriesRepresented: Number,
    sportsCovered: Number,
    editionsCovered: Number,
    medalBreakdown: {
      Gold: { type: Number, default: 0 },
      Silver: { type: Number, default: 0 },
      Bronze: { type: Number, default: 0 },
      None: { type: Number, default: 0 },
    },
    topSports: [{ label: String, count: Number }],
    topCountries: [{ label: String, count: Number }],
    recentEditions: [{ year: Number, count: Number }],
    filterOptions: {
      sports: [String],
      medals: [String],
      years: [Number],
      countries: [String],
    },
    lastImportedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Summary || mongoose.model("Summary", summarySchema);
