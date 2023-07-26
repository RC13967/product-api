import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    product_name: { type: String, required: true },
    product_description: { type: String, required: true },
    category_id: {type: String, required: true},
    product_image: {type: String, required: false},
    product_quantity: {type: Number, required: true},
    is_active: { type: Boolean, required: true },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
});

const Product = mongoose.model('product', productSchema);

export default Product;
