import express from 'express';
const router = express.Router();
import Product from '../models/product.js';
import mongoose from 'mongoose';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import dotenv from "dotenv";
dotenv.config();

// Create a connection to MongoDB using Mongoose
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
const storage = new GridFsStorage({
  db, // Replace with your MongoDB connection URL
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    // Generate a unique filename for the image using the book's title
    return{
      filename: `${Date.now()}-file-${file.originalname}`,
    }
  },
});

const upload = multer({ storage });

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id:req.params.id,
      is_active:true
    })
    if (!product) {
      return res.status(404).json({ error: 'No active Products available' });
    }
    if (product.product_image) {
      var ObjectId = mongoose.Types.ObjectId;
      var productImage = product.product_image;
      const imageFile = await db.collection('fs.files').findOne({_id: new ObjectId(productImage)});
      if (!imageFile) {
        return res.status(404).json({ message: 'Image not found' });
      }
      const imageStream = db.collection('fs.chunks').find({ files_id: new ObjectId(productImage) });
      let imageData = [];
      for await (const chunk of imageStream) {
        imageData.push(chunk.data.buffer);
      }
      const imageBuffer = Buffer.concat(imageData).toString('base64');
      let imageSrc = `data:${imageFile.contentType};base64,${imageBuffer}`;
      res.status(200).json({...product, imageSrc});
    } else {
      res.status(200).json({ product });
    }
  } catch (err) {
    req.log.error('Error finding products:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
// GET API endpoint to fetch all Products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ is_active: true });
    if (products.length > 0) {
      const result = [];

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
          result.push({ product, imageSrc });
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
router.post('/', upload.single('image'), async (req, res) => {
  const created_at = new Date();
  const updated_at = new Date();
  const is_active = true;

  try {
    const data = JSON.parse(req.body?.data);
    const { category_id, product_quantity, product_name, product_description } = data;
    const newProduct = new Product({
      category_id, product_quantity,
      product_name, product_description, is_active, created_at, updated_at
    });
    if (req.file) {
      newProduct.product_image = req.file.id;
    }
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (err) {
    req.log.error('Error creating a new Product:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// PUT API endpoint to update an existing Product
router.put('/:id', upload.single('image'), async (req, res) => {
  const updated_at = new Date();

  const data = req.body?.data ? JSON.parse(req.body.data) : "";
  let product_image;
  try {
    let updatedProduct;
    if (req.file) {
      product_image = req.file.id;
    }
    if(data){
      const { category_id, product_quantity,
        product_name, product_description, is_active } = data;
  
        updatedProduct = await Product.findByIdAndUpdate(
          req.params.id,
          { category_id, product_image, product_quantity,
            product_name, product_description, is_active, updated_at },
          { new: true } // Return the updated Product
        );
    } else {

      updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { product_image,  updated_at },
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
