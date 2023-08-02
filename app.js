import express from "express";
import mongoose from "mongoose";
import pinoHttp from "pino-http";
import categoryRoutes from "./routes/category.js";
import productRoutes from "./routes/product.js";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
export const app = express();
app.use(cors());

// Create a pino logger instance
const logger = pinoHttp();
// Middleware for structured logging with pino
app.use(logger);

app.use(express.json());
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;

mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("mongodb connected successfully"))
  .catch((err) => {
    console.error("mongodb connection failed:", err.message);
    process.exit(1); //exits application if mongodb isn't connected
  });

// Mount the category routes
app.use("/v1/categories", categoryRoutes);
// Mount the product routes
app.use("/v1/products", productRoutes);

// Handle 404 errors - Route not found
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Handle other errors
app.use((err, req, res, next) => {
  req.log.error(err); // Log errors with pino
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(PORT, () => console.log(`The server is running on port ${PORT}`));
