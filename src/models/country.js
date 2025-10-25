import mongoose from "mongoose";

const CountrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameLower: {
      type: String,
      index: true,
      lowercase: true,
    },
    capital: {
      type: String,
      default: null,
      trim: true,
    },
    region: {
      type: String,
      default: null,
      trim: true,
    },
    population: {
      type: Number,
      required: true,
      min: 0,
    },
    currency_code: {
      type: String,
      default: null,
      trim: true,
    },
    exchange_rate: {
      type: Number,
      default: null,
      min: 0,
    },
    estimated_gdp: {
      type: Number,
      default: null,
      min: 0,
    },
    flag_url: {
      type: String,
      default: null,
    },
    last_refreshed_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to set nameLower for case-insensitive queries
CountrySchema.pre("save", function (next) {
  if (this.name) {
    this.nameLower = this.name.toLowerCase();
  }
  next();
});

// Indexes for efficient querying
CountrySchema.index({ region: 1 });
CountrySchema.index({ currency_code: 1 });
CountrySchema.index({ estimated_gdp: -1 });

export default mongoose.model("Country", CountrySchema);
