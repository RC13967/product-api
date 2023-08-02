import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    category_name: {
      type: String,
      unique: true,
      required: true,
      index: { unique: true, collation: { locale: "en", strength: 2 } },
    },
    category_description: { type: String, required: true },
    is_active: { type: Boolean, required: true },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
  },
  { versionKey: false },
);

const Category = mongoose.model("category", categorySchema);

export default Category;
