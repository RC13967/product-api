import express from 'express';
const router = express.Router();
import Product from '../models/product.js';

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    req.log.error('Error finding Product by ID:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// GET API endpoint to fetch all Products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    if (products.length > 0) {
      res.json(products);
    }
    else {
      let message = "There are no products available";
      res.status(404).json({ error: message });
    }

  } catch (err) {
    req.log.error('Error fetching Products:', err.message); // Log errors with pino
    res.status(500).json({ error: 'Something went wrong' });
  }
});



// POST API endpoint to create a new Product
router.post('/', async (req, res) => {
  const created_at = new Date();
  const updated_at = new Date();
  const is_active = true;

  try {
    const { category_id, product_image, product_quantity, product_name, product_description } = req.body;
    const newProduct = new Product({
      category_id, product_image, product_quantity,
      product_name, product_description, is_active, created_at, updated_at
    });
    const savedProduct = await newProduct.save();
    console.log(savedProduct);
    res.status(201).json(savedProduct);
  } catch (err) {
    req.log.error('Error creating a new Product:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// PUT API endpoint to update an existing Product
router.put('/:id', async (req, res) => {
  const updated_at = new Date();
  try {
    const { category_id, product_image, product_quantity,
      Product_name, Product_description, is_active } = req.body;
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { category_id, product_image, product_quantity,
        Product_name, Product_description, is_active, updated_at },
      { new: true } // Return the updated Product
    );
    res.json(updatedProduct);
  } catch (err) {
    req.log.error('Error updating Product:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// PATCH API endpoint to partially update an existing Product
router.patch('/:id', async (req, res) => {
  const updated_at = new Date();
  try {
    const { is_active } = req.body;
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { is_active, updated_at },
      { new: true } // Return the updated Product
    );
    res.json(updatedProduct);
  } catch (err) {
    req.log.error('Error updating Product:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE API endpoint to delete a Product
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    req.log.error('Error deleting Product:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
export default router;
