import express from 'express';
const router = express.Router();
import Product from '../models/product.js';
import mongoose from 'mongoose';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import dotenv from "dotenv";
import {
  validateUniqueProductName,
  validateMandatoryFieldsProduct,
  isValidImageFile,
  isValidImageSize,
} from '../middleware.js';
dotenv.config();
// Create a connection to MongoDB using Mongoose
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
const storage = new GridFsStorage({
  db,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    // Generate a unique filename for the image using the book's title
    return {
      filename: `${Date.now()}-file-${file.originalname}`,
    }
  },
});

const upload = multer({ storage });

// Custom middleware to handle file upload
const handleFileUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle multer-specific errors
      return res.status(400).json({ error: 'Multer error: ' + err.message });
    } else if (err) {
      // Handle other errors that might occur during file upload
      return res.status(500).json({ error: 'File upload failed.' });
    }
    next();
  });
};


// GET API endpoint to fetch a single Product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      is_active: true
    });

    // Check if the product exists and is active
    if (!product) {
      return res.status(404).json({ error: 'No active Products available' });
    }

    // Retrieve product image if available and encode it to base64
    if (product.product_image) {
      let ObjectId = mongoose.Types.ObjectId;
      let productImage = product.product_image;
      const imageFile = await db.collection('fs.files').findOne({ _id: new ObjectId(productImage) });
      if (!imageFile) {
        return res.status(404).json({ message: 'Image not found' });
      }

      const imageStream = db.collection('fs.chunks').find({ files_id: new ObjectId(productImage) });
      let imageData = [];
      for await (const chunk of imageStream) {
        imageData.push(chunk.data.buffer);
      }
      product.imageSrc = "nice";
      console.log(product.imageSrc)
      const imageBuffer = Buffer.concat(imageData).toString('base64');
      let imageSrc = `data:${imageFile.contentType};base64,${imageBuffer}`;
      res.status(200).json({ ...product._doc, imageSrc });
    } else {
      res.status(200).json(product);
    }
  } catch (err) {
    req.log.error('Error finding products:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET API endpoint to fetch all Products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ is_active: true }).sort({ "created_at": 'desc' });;

    // Check if there are active products available
    if (products.length > 0) {
      const result = [];

      // Retrieve product image if available for each product and encode it to base64
      for (const product of products) {
        if (product.product_image) {
          const ObjectId = mongoose.Types.ObjectId;
          const productImage = product.product_image;
          const imageFile = await db.collection('fs.files').findOne({ _id: new ObjectId(productImage) });

          if (!imageFile) {
            return res.status(404).json({ message: 'Image not found' });
          }

          const imageStream = db.collection('fs.chunks').find({ files_id: new ObjectId(productImage) });
          const imageData = [];

          for await (const chunk of imageStream) {
            imageData.push(chunk.data.buffer);
          }

          const imageBuffer = Buffer.concat(imageData).toString('base64');
          const imageSrc = `data:${imageFile.contentType};base64,${imageBuffer}`;
          result.push({ ...product._doc, imageSrc });
        } else {
          result.push({ product });
        }
      }
      res.status(200).json(result);
    } else {
      let message = "There are no active products";
      res.status(404).json({ error: message });
    }
  } catch (err) {
    console.error('Error fetching Products:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST API endpoint to create a new Product
router.post('/',
  upload.single('image'),
  validateMandatoryFieldsProduct(['product_name', 'product_description', 'product_quantity']),
  validateUniqueProductName,
  async (req, res) => {
    const created_at = new Date();
    const updated_at = new Date();
    const is_active = true;

    try {
      const data = JSON.parse(req.body.data);
      console.log(data);
      const { category_id, product_quantity, product_name, product_description } = data;
      const newProduct = new Product({
        category_id, product_quantity,
        product_name, product_description, is_active, created_at, updated_at
      });
      // Save the newly created product
      if (req.file) {
        newProduct.product_image = req.file.id;
      }
      const savedProduct = await newProduct.save();
      res.status(201).json(savedProduct);
    } catch (err) {
      console.log(err.message);
      req.log.error('Error creating a new Product:', err.message);
      res.status(500).json({ error: 'Something went wrong' });
    }
  });

// PUT API endpoint to update an existing Product
router.put('/:id', handleFileUpload, validateUniqueProductName, async (req, res) => {
  const updated_at = new Date();
  const data = req.body?.data ? JSON.parse(req.body.data) : "";
  let product_image;
  try {
    let updatedProduct;
    if (req.file) {
      if (!isValidImageFile(req.file.originalname))
        return res.status(400).json({ error: 'Invalid image file. Only image files (JPEG, JPG, PNG) are allowed.' });
      if (!isValidImageSize(req.file.size))
        return res.status(400).json({ error: `Only images of size less than 1 mb are allowed.` });
      product_image = req.file.id;
    }

    // Check if data exists and update the product accordingly
    if (data) {
      const { category_id, product_quantity,
        product_name, product_description, is_active } = data;

      updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
          category_id, product_image, product_quantity,
          product_name, product_description, is_active, updated_at
        },
        { new: true } // Return the updated Product
      );
    } else {
      updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { product_image, updated_at },
        { new: true } // Return the updated Product
      );
    }

    res.json(updatedProduct);
  } catch (err) {
    req.log.error('Error updating Product:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// PATCH API endpoint to partially update an existing Product
router.patch('/:id', handleFileUpload, validateUniqueProductName, async (req, res) => {
  const updated_at = new Date();

  const data = req.body?.data ? JSON.parse(req.body.data) : "";
  let product_image;
  try {
    let updatedProduct;
    if (req.file) {
      if (!isValidImageFile(req.file.originalname))
        return res.status(400).json({ error: 'Invalid image file. Only image files (JPEG, JPG, PNG) are allowed.' });
      if (!isValidImageSize(req.file.size))
        return res.status(400).json({ error: `Only images of size less than 1 mb are allowed.` });
      product_image = req.file.id;
    }

    // Check if data exists and update the product accordingly
    if (data) {
      const { category_id, product_quantity,
        product_name, product_description, is_active } = data;

      updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
          category_id, product_image, product_quantity,
          product_name, product_description, is_active, updated_at
        },
        { new: true } // Return the updated Product
      );
    } else {
      updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { product_image, updated_at },
        { new: true } // Return the updated Product
      );
    }

    res.json(updatedProduct);
  } catch (err) {
    req.log.error('Error updating Product:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE API endpoint to delete a Product
router.delete('/:id', async (req, res) => {
  try {
    // Find and delete the product by ID
    await Product.findByIdAndDelete(req.params.id);

    // Respond with a success message
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    // Log the error and respond with an error message if something went wrong
    req.log.error('Error deleting Product:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
