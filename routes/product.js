import express from "express";
const router = express.Router();
import Product from "../models/product.js";
import mongoose from "mongoose";
import multer from "multer";
import { GridFsStorage } from "multer-gridfs-storage";
import dotenv from "dotenv";
import {
  validateUniqueProductName,
  validateMandatoryFieldsProduct,
  isValidImageFile,
  isValidImageSize,
} from "../middleware.js";
import Category from "../models/category.js";
import { errorMessages, successMessages } from "../message.js";
dotenv.config();
const ObjectId = mongoose.Types.ObjectId;
// Create a connection to MongoDB using Mongoose
const MONGO_URL =
  process.env.NODE_ENV === "production"
    ? process.env.MONGO_PROD_URL
    : process.env.MONGO_LOCAL_URL;
mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
const storage = new GridFsStorage({
  db,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    // Generate a unique filename for the image
    return {
      filename: `${Date.now()}-file-${file.originalname}`,
    };
  },
});

const upload = multer({ storage });

// Custom middleware to handle file upload
const handleFileUpload = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Handle multer-specific errors
      return res.status(400).json({ error: "Multer error: " + err.message });
    } else if (err) {
      // Handle other errors that might occur during file upload
      return res.status(500).json({ error: "File upload failed." });
    }
    next();
  });
};

router.post("/dateFilter", async (req, res) => {
  const { fromDate, toDate } = req.body;
  try {
    const products = await Product.find({
      created_at: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    }).sort({ created_at: "desc" });

    // Check if there are active products available
    if (products.length > 0) {
      const result = [];

      // Retrieve product image if available for each product and encode it to base64
      for (const product of products) {
        if (product.product_image) {
          const imageFile = await db
            .collection("fs.files")
            .findOne({ _id: new ObjectId(product.product_image) });

          if (!imageFile) {
            return res
              .status(404)
              .json({ message: errorMessages.imageNotFound });
          }

          const imageStream = db
            .collection("fs.chunks")
            .find({ files_id: new ObjectId(product.product_image) });
          const imageData = [];

          for await (const chunk of imageStream) {
            imageData.push(chunk.data.buffer);
          }

          const imageBuffer = Buffer.concat(imageData).toString("base64");
          const imageSrc = `data:${imageFile.contentType};base64,${imageBuffer}`;
          result.push({ ...product._doc, imageSrc });
        } else {
          result.push({ product });
        }
      }
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: errorMessages.noProductsInRange });
    }
  } catch (err) {
    console.error("Error fetching Products:", err.message);
    res.status(500).json({ error: errorMessages.somethingWentWrong });
  }
});
// GET API endpoint to fetch a single Product by ID
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      is_active: true,
    });

    // Check if the product exists and is active
    if (!product) {
      return res.status(404).json({ error: errorMessages.productNotFound });
    }

    // Retrieve product image if available and encode it to base64
    if (product.product_image) {
      const [imageFile, imageData] = await Promise.all([
        db
          .collection("fs.files")
          .findOne({ _id: new ObjectId(product.product_image) }),
        db
          .collection("fs.chunks")
          .find({ files_id: new ObjectId(product.product_image) })
          .toArray(),
      ]);

      if (!imageFile || imageData.length === 0) {
        return res.status(404).json({ message: errorMessages.imageNotFound });
      }

      const imageBuffer = Buffer.concat(
        imageData.map((chunk) => chunk.data.buffer),
      ).toString("base64");
      const imageSrc = `data:${imageFile.contentType};base64,${imageBuffer}`;
      res.status(200).json({ ...product._doc, imageSrc });
    } else {
      res.status(200).json(product);
    }
  } catch (err) {
    req.log.error("Error finding products:", err.message);
    res.status(500).json({ error: errorMessages.somethingWentWrong });
  }
});

// GET API endpoint to fetch all Products
router.get("/", async (req, res) => {
  try {
    const products = await Product.aggregate([
      { $match: { is_active: true } },
      { $sort: { created_at: -1 } },
    ]);

    // Check if there are active products available
    if (products.length > 0) {
      const imagePromises = products.map(async (product) => {
        if (product.product_image) {
          const [imageFile, imageData] = await Promise.all([
            db
              .collection("fs.files")
              .findOne({ _id: new ObjectId(product.product_image) }),
            db
              .collection("fs.chunks")
              .find({ files_id: new ObjectId(product.product_image) })
              .toArray(),
          ]);

          if (!imageFile || imageData.length === 0) {
            throw new Error(errorMessages.imageNotFound);
          }

          const imageBuffer = Buffer.concat(
            imageData.map((chunk) => chunk.data.buffer),
          );
          const imageSrc = `data:${
            imageFile.contentType
          };base64,${imageBuffer.toString("base64")}`;
          return { ...product, imageSrc };
        } else {
          return { ...product };
        }
      });

      const result = await Promise.all(imagePromises);
      res.status(200).json(result);
    } else {
      res.status(404).json({ error: errorMessages.noActiveProduct });
    }
  } catch (err) {
    console.error("Error fetching Products:", err.message);
    res.status(500).json({ error: errorMessages.somethingWentWrong });
  }
});

// POST API endpoint to create a new Product
router.post(
  "/",
  upload.single("image"),
  validateMandatoryFieldsProduct([
    "product_name",
    "product_description",
    "product_quantity",
  ]),
  validateUniqueProductName,
  async (req, res) => {
    try {
      const data = JSON.parse(req.body.data);
      const {
        category_id,
        product_quantity,
        product_name,
        product_description,
      } = data;

      const categoryExists = await Category.exists({ _id: category_id });
      if (!categoryExists) {
        return res.status(404).json({ error: errorMessages.productCantSave });
      }

      const newProduct = new Product({
        category_id,
        product_quantity,
        product_name,
        product_description,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Save the newly created product
      if (req.file) {
        newProduct.product_image = req.file.id;
      }

      const savedProduct = await newProduct.save();
      res.status(201).json(savedProduct);
    } catch (err) {
      req.log.error("Error creating a new Product:", err.message);
      res.status(500).json({ error: errorMessages.somethingWentWrong });
    }
  },
);

// PUT API endpoint to update an existing Product
router.put(
  "/:id",
  handleFileUpload,
  validateUniqueProductName,
  async (req, res) => {
    const data = req.body?.data ? JSON.parse(req.body.data) : "";
    try {
      let updatedProduct, product_image;

      if (req.file) {
        if (
          !isValidImageFile(req.file.originalname) ||
          !isValidImageSize(req.file.size)
        ) {
          return res.status(400).json({
            error: errorMessages.invalidImageFile,
          });
        }
        product_image = req.file.id;
      }

      if (data) {
        const {
          category_id,
          product_quantity,
          product_name,
          product_description,
          is_active,
        } = data;

        if (category_id) {
          const categoryExists = await Category.exists({ _id: category_id });
          if (!categoryExists) {
            return res
              .status(404)
              .json({ error: errorMessages.productCantSave });
          }
        }

        const updateData = {
          category_id,
          product_image,
          product_quantity,
          product_name,
          product_description,
          is_active,
          updated_at: new Date(),
        };

        updatedProduct = await Product.findByIdAndUpdate(
          req.params.id,
          updateData,
          { new: true }, // Return the updated Product
        );
      } else {
        const updateData = { product_image, updated_at: new Date() };
        updatedProduct = await Product.findByIdAndUpdate(
          req.params.id,
          updateData,
          { new: true }, // Return the updated Product
        );
      }

      res.json(updatedProduct);
    } catch (err) {
      req.log.error("Error updating Product:", err.message);
      res.status(500).json({ error: errorMessages.somethingWentWrong });
    }
  },
);

// PATCH API endpoint to partially update an existing Product
router.patch(
  "/:id",
  handleFileUpload,
  validateUniqueProductName,
  async (req, res) => {
    const data = req.body?.data ? JSON.parse(req.body.data) : "";
    let product_image;
    try {
      let updatedProduct;
      if (req.file) {
        if (
          !isValidImageFile(req.file.originalname) ||
          !isValidImageSize(req.file.size)
        )
          return res.status(400).json({
            error: errorMessages.invalidImageFile,
          });
        product_image = req.file.id;
      }
      // Check if data exists and update the product accordingly
      if (data) {
        const {
          category_id,
          product_quantity,
          product_name,
          product_description,
          is_active,
        } = data;
        if (category_id) {
          const categoryExists = await Category.exists({ _id: category_id });
          if (!categoryExists) {
            return res
              .status(404)
              .json({ error: errorMessages.productCantSave });
          }
        }

        updatedProduct = await Product.findByIdAndUpdate(
          req.params.id,
          {
            category_id,
            product_image,
            product_quantity,
            product_name,
            product_description,
            is_active,
            updated_at: new Date(),
          },
          { new: true }, // Return the updated Product
        );
      } else {
        updatedProduct = await Product.findByIdAndUpdate(
          req.params.id,
          { product_image, updated_at: new Date() },
          { new: true }, // Return the updated Product
        );
      }

      res.json(updatedProduct);
    } catch (err) {
      req.log.error("Error updating Product:", err.message);
      res.status(500).json({ error: errorMessages.somethingWentWrong });
    }
  },
);

// DELETE API endpoint to delete a Product
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id });

    if (!product) {
      return res.status(404).json({ error: errorMessages.productNotFound });
    }

    // Remove image file
    await db
      .collection("fs.files")
      .deleteOne({ _id: new ObjectId(product.product_image) });
    await db
      .collection("fs.chunks")
      .deleteMany({ _id: new ObjectId(product.product_image) });

    res.json({ message: successMessages.productDeleted });
  } catch (err) {
    // Log the error and respond with an error message if something went wrong
    req.log.error("Error deleting Product:", err.message);
    res.status(500).json({ error: errorMessages.somethingWentWrong });
  }
});

export default router;
