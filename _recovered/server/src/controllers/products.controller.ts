import type { Response } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../middleware/auth.js';
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getProduct,
  listCategories,
  listCategoryRecords,
  searchProducts,
  updateProduct,
} from '../models/product.model.js';

const productSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  price: z.number().nonnegative(),
  sku: z.string().trim().min(1),
  tags: z.array(z.string()).optional(),
  available: z.boolean().optional(),
});

export function searchProductsController(req: AuthedRequest, res: Response): void {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const category = typeof req.query.category === 'string' ? req.query.category : null;
  const limit = Number(req.query.limit ?? 40);
  const availableOnly = req.query.available !== 'false';
  const started = Date.now();
  const result = searchProducts(q, category, Number.isFinite(limit) ? limit : 40, availableOnly);
  res.json({ ...result, query: q, tookMs: Date.now() - started, categories: listCategories() });
}

export function getProductController(req: AuthedRequest, res: Response): void {
  const product = getProduct(req.params.id);
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }
  res.json({ data: product });
}

export function createProductController(req: AuthedRequest, res: Response): void {
  const body = productSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'Invalid product payload', issues: body.error.issues });
    return;
  }
  try {
    const created = createProduct(body.data);
    res.status(201).json({ data: created });
  } catch {
    res.status(409).json({ message: 'SKU already exists or invalid category' });
  }
}

export function updateProductController(req: AuthedRequest, res: Response): void {
  const body = productSchema.partial().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'Invalid product payload', issues: body.error.issues });
    return;
  }
  const updated = updateProduct(req.params.id, body.data);
  if (!updated) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }
  res.json({ data: updated });
}

export function deleteProductController(req: AuthedRequest, res: Response): void {
  if (!deleteProduct(req.params.id)) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }
  res.status(204).send();
}

export function listCategoriesController(_req: AuthedRequest, res: Response): void {
  res.json({ data: listCategoryRecords() });
}

export function createCategoryController(req: AuthedRequest, res: Response): void {
  const body = z.object({ name: z.string().trim().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'name required' });
    return;
  }
  try {
    res.status(201).json({ data: createCategory(body.data.name) });
  } catch {
    res.status(409).json({ message: 'Category already exists' });
  }
}

export function deleteCategoryController(req: AuthedRequest, res: Response): void {
  if (!deleteCategory(req.params.id)) {
    res.status(409).json({ message: 'Category not found or still has products' });
    return;
  }
  res.status(204).send();
}
