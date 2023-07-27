import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    product_name: { type: String, unique:true, required: true,
        index: { unique: true, collation: { locale: 'en', strength: 2 } } },
    product_description: { type: String, unique:true, required: true,
        index: { unique: true, collation: { locale: 'en', strength: 2 } } },
    category_id: {type: String, required: true},
    product_image: {type: String, unique:true, required: true},
    product_quantity: {type: Number, required: true},
    is_active: { type: Boolean, required: true },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
});

const Product = mongoose.model('product', productSchema);

export default Product;
