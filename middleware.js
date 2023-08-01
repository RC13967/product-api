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



// Middleware to validate unique product_name
export const validateUniqueProductName = async (req, res, next) => {
  let product_name;
  if(req.body.data)  
  product_name  = JSON.parse(req.body.data).product_name;
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



// Middleware to validate mandatory fields for 'category' in the request body
export const validateMandatoryFields = (mandatoryFields) => (req, res, next) => {
  const missingFields = mandatoryFields.filter((field) => !req.body[field]);
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Missing mandatory fields: ${missingFields.join(', ')}` });
  }
  next();
};

// Middleware to validate mandatory fields for 'product'
export const validateMandatoryFieldsProduct = (mandatoryFields) => (req, res, next) => {
  const missingFields = mandatoryFields.filter((field) => !getFieldValue(req.body, field));
  if (!req.file ) missingFields.push("Image");//   && !JSON.parse(req.body.data).imageUrl
  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Missing mandatory fields: ${missingFields.join(', ')}` });
  }
  if (!isValidImageFile(req.file.originalname)) {
    return res.status(400).json({ error: `Invalid image file. Only image files(JPEG, JPG, PNG) are allowed.` });
  }
  if (!isValidImageSize(req.file.size)) {
    return res.status(400).json({ error: `Only images of size less than 1 mb are allowed.` });
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


// The function checks if the file is valid image ('.jpg', '.jpeg', '.png')
export const isValidImageFile = (fileName) => {
  const validImageExtensions = ['.jpg', '.jpeg', '.png'];
  const dotIndex = fileName.lastIndexOf('.');
  const fileExtension = dotIndex !== -1 ? fileName.slice(dotIndex).toLowerCase() : '';
  if (!validImageExtensions.includes(fileExtension)) return false;
  return true;

};

//The function checks if the image size is below 1 mb
export const isValidImageSize = (fileSize) => {
  if (fileSize > 1 * 1024 * 1024) return false;
  return true
}
