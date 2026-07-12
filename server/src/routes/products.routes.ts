import { Router } from 'express';
import {
  createCategoryController,
  createProductController,
  deleteCategoryController,
  deleteProductController,
  getProductController,
  getCategoryController,
  listCategoriesController,
  searchProductsController,
  updateProductController,
  updateCategoryController,
} from '../controllers/products.controller.js';
import { optionalAuth, requirePermission } from '../middleware/auth.js';

export function productsRoutes(): Router {
  const router = Router();
  router.get('/', optionalAuth, requirePermission('products:read'), searchProductsController);
  router.post('/', optionalAuth, requirePermission('products:write'), createProductController);
  router.get('/:id', optionalAuth, requirePermission('products:read'), getProductController);
  router.patch('/:id', optionalAuth, requirePermission('products:write'), updateProductController);
  router.delete('/:id', optionalAuth, requirePermission('products:write'), deleteProductController);
  return router;
}

export function categoriesRoutes(): Router {
  const router = Router();
  router.get('/', optionalAuth, requirePermission('products:read'), listCategoriesController);
  router.post('/', optionalAuth, requirePermission('categories:write'), createCategoryController);
  router.get('/:id', optionalAuth, requirePermission('products:read'), getCategoryController);
  router.patch('/:id', optionalAuth, requirePermission('categories:write'), updateCategoryController);
  router.delete('/:id', optionalAuth, requirePermission('categories:write'), deleteCategoryController);
  return router;
}
