import dotenv from "dotenv";
dotenv.config();
export function genericErrorHandler(statusCode, errorObject) {
  return res.status(statusCode).json(errorObject);
}
export const errorMessages = {
  imageNotFound: "Image not found",
  noProductsInRange: "There are no products within the range",
  noActiveProducts: "There are no active products",
  productNotFound: "Product not found",
  productCantSave: "Product can't be saved in this category",
  invalidImageFile: `Invalid image file. Only image files (JPEG, JPG, PNG) of size less than ${process.env.MAX_IMAGE_SIZE} are allowed.`,
  categoryNotFound: "No active categories available",
  productUpdateError: "Error updating Category",
  categoryDeleteError: "Error deleting Category",
  somethingWentWrong: "Something went wrong",
};

export const successMessages = {
  productCreated: "Product created successfully",
  productUpdated: "Product updated successfully",
  productDeleted: "Product deleted successfully",
  categoryCreated: "Category created successfully",
  categoryUpdated: "Category updated successfully",
  categoryDeleted: "Category deleted successfully",
};
