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

export async function searchProductsController(req: AuthedRequest, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const category = typeof req.query.category === 'string' ? req.query.category : null;
  const limit = Number(req.query.limit ?? 40);
  const availableOnly = req.query.available !== 'false';
  const started = Date.now();
  const result = await searchProducts(q, category, Number.isFinite(limit) ? limit : 40, availableOnly);
  res.json({ ...result, query: q, tookMs: Date.now() - started, categories: await listCategories() });
}

export async function getProductController(req: AuthedRequest, res: Response): Promise<void> {
  const product = await getProduct(req.params.id);
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }
  res.json({ data: product });
}

export async function createProductController(req: AuthedRequest, res: Response): Promise<void> {
  const body = productSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'Invalid product payload', issues: body.error.issues });
    return;
  }
  try {
    const created = await createProduct(body.data);
    res.status(201).json({ data: created });
  } catch {
    res.status(409).json({ message: 'SKU already exists or invalid category' });
  }
}

export async function updateProductController(req: AuthedRequest, res: Response): Promise<void> {
  const body = productSchema.partial().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'Invalid product payload', issues: body.error.issues });
    return;
  }
  const updated = await updateProduct(req.params.id, body.data);
  if (!updated) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }
  res.json({ data: updated });
}

export async function deleteProductController(req: AuthedRequest, res: Response): Promise<void> {
  if (!(await deleteProduct(req.params.id))) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }
  res.status(204).send();
}

export async function listCategoriesController(_req: AuthedRequest, res: Response): Promise<void> {
  res.json({ data: await listCategoryRecords() });
}

export async function createCategoryController(req: AuthedRequest, res: Response): Promise<void> {
  const body = z.object({ name: z.string().trim().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: 'name required' });
    return;
  }
  try {
    res.status(201).json({ data: await createCategory(body.data.name) });
  } catch {
    res.status(409).json({ message: 'Category already exists' });
  }
}

export async function deleteCategoryController(req: AuthedRequest, res: Response): Promise<void> {
  if (!(await deleteCategory(req.params.id))) {
    res.status(409).json({ message: 'Category not found or still has products' });
    return;
  }
  res.status(204).send();
}
