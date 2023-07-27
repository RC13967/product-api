import category from './models/category.js';
import Product from './models/product.js';

// Middleware to validate unique category_name
export const validateUniqueCategoryName = async (req, res, next) => {
  const { category_name } = req.body;
  try {
    const existingCategory = await category.findOne({ category_name });
    if (existingCategory) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Middleware to validate unique category_description
export const validateUniqueCategoryDescription = async (req, res, next) => {
  const { category_description } = req.body;
  try {
    const existingCategory = await category.findOne({ category_description });
    if (existingCategory) {
      return res.status(409).json({ error: 'Category with this description already exists' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Middleware to validate unique product_name
export const validateUniqueProductName = async (req, res, next) => {
  const { product_name } = JSON.parse(req.body.data);
  try {
    const existingProduct = await Product.findOne({ product_name });
    if (existingProduct) {
      return res.status(409).json({ error: 'Product with this name already exists' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Middleware to validate unique product_description
export const validateUniqueProductDescription = async (req, res, next) => {
  const { product_description } = JSON.parse(req.body.data);
  try {
    const existingProduct = await Product.findOne({ product_description });
    if (existingProduct) {
      return res.status(409).json({ error: 'Product with this description already exists' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// Middleware to validate mandatory fields in the request body
export const validateMandatoryFields = (mandatoryFields) => (req, res, next) => {
  const missingFields = mandatoryFields.filter((field) => !req.body[field]);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Missing mandatory fields: ${missingFields.join(', ')}` });
  }
  next();
};

export const validateMandatoryFieldsProduct = (mandatoryFields) => (req, res, next) => {
  const missingFields = mandatoryFields.filter((field) => !getFieldValue(req.body, field));
  
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Missing mandatory fields: ${missingFields.join(', ')}` });
  }
  next();
};

// Helper function to handle nested fields in form data
const getFieldValue = (formData, field) => {
  if (!formData) return null;
  if (formData[field]) {
    return formData[field];
  }
  const dataObject = JSON.parse(formData.data || '{}');
  return dataObject[field] || null;
};
