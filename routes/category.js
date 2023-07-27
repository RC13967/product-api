import express from 'express';
const router = express.Router();
import Category from '../models/category.js';
import Product from '../models/product.js';
import {
  validateUniqueCategoryName,
  validateUniqueCategoryDescription,
  validateMandatoryFields,
} from '../middleware.js';
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const category = await Category.findOne({
      _id: id,
      is_active: true
    });
    if (!category) {
      return res.status(404).json({ error: 'No active categories available' });
    }
    res.json(category);
  } catch (err) {
    req.log.error('Error finding Category:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// GET API endpoint to fetch all Categorys
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true });
    if (categories.length > 0) {
      res.json(categories);
    }
    else {
      let message = "There are no active categories";
      res.status(404).json({ error: message });
    }

  } catch (err) {
    req.log.error('Error fetching Categories:', err.message); // Log errors with pino
    res.status(500).json({ error: 'Something went wrong' });
  }
});



// POST API endpoint to create a new Category
router.post('/', validateMandatoryFields(['category_name', 'category_description']),
  validateUniqueCategoryName,
  validateUniqueCategoryDescription,
  async (req, res) => {
    const created_at = new Date();
    const updated_at = new Date();
    const is_active = true;

    try {
      const { category_name, category_description } = req.body;
      const newCategory = new Category({
        category_name, category_description, is_active, created_at, updated_at
      });
      const savedCategory = await newCategory.save();
      res.status(201).json(savedCategory);
    } catch (err) {
      req.log.error('Error creating a new Category:', err.message);
      res.status(500).json({ error: 'Something went wrong' });
    }
  });

// PUT API endpoint to update an existing Category
router.put('/:id', async (req, res) => {
  const updated_at = new Date();
  const category_id = req.params.id;
  try {
    const { category_name, category_description, is_active } = req.body;
    let updatedProducts;
    if (is_active === false) { //if the status of category changes, change all products status
      updatedProducts = await Product.updateMany(
        { category_id: category_id },
        { category_name, category_description, updated_at, is_active },
        { new: true } // Return the updated Category
      );
    }
    const updatedCategory = await Category.findByIdAndUpdate(
      category_id,
      { category_name, category_description, updated_at, is_active },
      { new: true } // Return the updated Category
    );
    res.json(updatedCategory);
  } catch (err) {
    req.log.error('Error updating Category:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// PATCH API endpoint to partially update an existing Category
router.patch('/:id', async (req, res) => {
  const updated_at = new Date();
  const category_id = req.params.id;
  try {
    const { is_active } = req.body;
    const updatedCategory = await Category.findByIdAndUpdate(
      category_id,
      { is_active, updated_at },
      { new: true } // Return the updated Category
    );
    await Product.updateMany(
      { category_id: category_id },
      { category_name, category_description, updated_at, is_active },
      { new: true } // Return the updated Category
    );
    res.json(updatedCategory);
  } catch (err) {
    req.log.error('Error updating Category:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE API endpoint to delete a Category
router.delete('/:id', async (req, res) => {
  const category_id = req.params.id;
  try {
    await Category.findByIdAndDelete(req.params.id);
    await Product.deleteMany({ category_id: category_id });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    req.log.error('Error deleting Category:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
export default router;
