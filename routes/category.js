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
dotenv.config();
mongoose.connect(process.env.MONGO_URL, {
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
      return res.status(404).json({ error: "No active categories available" });
    }
    res.json(category);
  } catch (err) {
    req.log.error("Error finding Category:", err.message);
    res.status(500).json({ error: "Something went wrong" });
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
      res.status(404).json({ error: "There are no active categories" });
    }
  } catch (err) {
    req.log.error("Error fetching Categories:", err.message); // Log errors with pino
    res.status(500).json({ error: "Something went wrong" });
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
        is_active:true,
        created_at: new Date(),
        updated_at:new Date(),
      });

      // Save the newly created category
      const savedCategory = await newCategory.save();
      res.status(201).json(savedCategory);
    } catch (err) {
      req.log.error("Error creating a new Category:", err.message);
      res.status(500).json({ error: "Something went wrong" });
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
        { category_name, category_description, updated_at: new Date(), is_active },
        { new: true }, // Return the updated Category
      );
    }

    // Update the existing category
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id ,
      { category_name, category_description, updated_at, is_active },
      { new: true }, // Return the updated Category
    );
    res.json(updatedCategory);
  } catch (err) {
    req.log.error("Error updating Category:", err.message);
    res.status(500).json({ error: "Something went wrong" });
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
        { category_id: req.params.id},
        { category_name, category_description, updated_at: new Date(), is_active },
        { new: true }, // Return the updated Category
      );
    }

    // Update the existing category
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { category_name, category_description, updated_at: new Date(), is_active },
      { new: true }, // Return the updated Category
    );
    res.json(updatedCategory);
  } catch (err) {
    req.log.error("Error updating Category:", err.message);
    res.status(500).json({ error: "Something went wrong" });
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
    await Product.deleteMany({ category_id: req.params.id});
    //delete images of products
    await db.collection("fs.files").deleteMany({ _id: { $in: productIds } });
    await db.collection("fs.chunks").deleteMany({ _id: { $in: productIds } });
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    req.log.error("Error deleting Category:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
