import express from "express";
const router = express.Router();
import Category from "../models/category.js";
import Product from "../models/product.js";
import mongoose from "mongoose";
import {
  validateUniqueCategoryName,
  validateMandatoryFields,
} from "../middleware.js";
import dotenv from "dotenv";
import {
  errorMessages,
  successMessages,
  genericErrorHandler,
} from "../message.js";
dotenv.config();
const MONGO_URL =
  process.env.NODE_ENV === "production"
    ? process.env.MONGO_PROD_URL
    : process.env.MONGO_LOCAL_URL;
mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
// GET API endpoint to fetch a single Category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      is_active: true,
    });

    // Check if the category exists and is active
    if (!category) {
      // return res.status(404).json({ error: errorMessages.categoryNotFound });
      let error = { error: errorMessages.categoryNotFound };
      return genericErrorHandler(404, error);
    }
    res.json(category);
  } catch (err) {
    req.log.error("Error finding Category:", err.message);
    return genericErrorHandler(500, errorMessages.somethingWentWrong);
  }
});

// GET API endpoint to fetch all Categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true }).sort({
      created_at: "desc",
    });

    // Check if there are active categories available
    if (categories.length > 0) {
      res.json(categories);
    } else {
      res.status(404).json({ error: errorMessages.categoryNotFound });
    }
  } catch (err) {
    req.log.error("Error fetching Categories:", err.message); // Log errors with pino
    return genericErrorHandler(500, errorMessages.somethingWentWrong);
  }
});

// POST API endpoint to create a new Category
router.post(
  "/",
  validateMandatoryFields(["category_name", "category_description"]),
  validateUniqueCategoryName,
  async (req, res) => {
    try {
      const { category_name, category_description } = req.body;
      const newCategory = new Category({
        category_name,
        category_description,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Save the newly created category
      const savedCategory = await newCategory.save();
      res.status(201).json(savedCategory);
    } catch (err) {
      req.log.error("Error creating a new Category:", err.message);
      return genericErrorHandler(500, errorMessages.somethingWentWrong);
    }
  },
);

// PUT API endpoint to update an existing Category
router.put("/:id", validateUniqueCategoryName, async (req, res) => {
  try {
    const { category_name, category_description, is_active } = req.body;
    let updatedProducts;

    // if category changes to in_active, change all the products to in_active
    if (is_active === false) {
      updatedProducts = await Product.updateMany(
        { category_id: req.params.id },
        {
          category_name,
          category_description,
          updated_at: new Date(),
          is_active,
        },
        { new: true }, // Return the updated Category
      );
    }

    // Update the existing category
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { category_name, category_description, updated_at, is_active },
      { new: true }, // Return the updated Category
    );
    res.json(updatedCategory);
  } catch (err) {
    req.log.error("Error updating Category:", err.message);
    return genericErrorHandler(500, errorMessages.somethingWentWrong);
  }
});

// PATCH API endpoint to partially update an existing Category
router.patch("/:id", validateUniqueCategoryName, async (req, res) => {
  try {
    const { category_name, category_description, is_active } = req.body;
    let updatedProducts;
    // if category changes to in_active, change all the products to in_active
    if (is_active === false) {
      updatedProducts = await Product.updateMany(
        { category_id: req.params.id },
        {
          category_name,
          category_description,
          updated_at: new Date(),
          is_active,
        },
        { new: true }, // Return the updated Category
      );
    }

    // Update the existing category
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      {
        category_name,
        category_description,
        updated_at: new Date(),
        is_active,
      },
      { new: true }, // Return the updated Category
    );
    res.json(updatedCategory);
  } catch (err) {
    req.log.error("Error updating Category:", err.message);
    return genericErrorHandler(500, errorMessages.somethingWentWrong);
  }
});

// DELETE API endpoint to delete a Category
router.delete("/:id", async (req, res) => {
  const ObjectId = mongoose.Types.ObjectId;
  try {
    // Find and delete the category by ID
    await Category.findByIdAndDelete(req.params.id);
    const products = await Product.find({
      category_id: new ObjectId(req.params.id),
    });
    let productIds = products.map(
      (product) => new ObjectId(product.product_image),
    );
    // Delete all products associated with the category
    await Product.deleteMany({ category_id: req.params.id });
    //delete images of products
    await db.collection("fs.files").deleteMany({ _id: { $in: productIds } });
    await db.collection("fs.chunks").deleteMany({ _id: { $in: productIds } });
    return genericErrorHandler(201, successMessages.categoryDeleted);
  } catch (err) {
    req.log.error("Error deleting Category:", err.message);
    return genericErrorHandler(500, errorMessages.somethingWentWrong);
  }
});

export default router;
