import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    category_name: { type: String, required: true },
    category_description: { type: String, required: true },
    is_active: { type: Boolean, required: true },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
});

const Category = mongoose.model('category', categorySchema);

export default Category;
