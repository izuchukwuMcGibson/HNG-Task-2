import mongoose from "mongoose";

const MetaSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
});

export default mongoose.model("Meta", MetaSchema);