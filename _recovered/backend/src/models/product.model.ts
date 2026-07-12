import { v4 as uuid } from 'uuid';
import mongoose, { Schema } from 'mongoose';
import type { ProductDto } from './domain.js';

const categorySchema = new Schema(
  {
    _id: { type: String, default: () => uuid() },
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: false },
);

const productSchema = new Schema(
  {
    _id: { type: String, default: () => uuid() },
    name: { type: String, required: true },
    categoryId: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    sku: { type: String, required: true, unique: true },
    tags: { type: [String], default: [] },
    available: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const CategoryModel = mongoose.models.Category || mongoose.model('Category', categorySchema);
const ProductModel = mongoose.models.Product || mongoose.model('Product', productSchema);

function toProductDto(row: Record<string, unknown>, categoryName: string): ProductDto {
  return {
    id: String(row._id),
    name: String(row.name),
    category: categoryName,
    price: Number(row.price),
    sku: String(row.sku),
    tags: (row.tags as string[] | undefined) ?? [],
    available: Boolean(row.available),
  };
}

async function categoryNameById(id: string): Promise<string> {
  const cat = await CategoryModel.findById(id).lean();
  return cat ? String(cat.name) : '';
}

export async function searchProducts(
  term: string,
  category?: string | null,
  limit = 40,
  availableOnly = true,
): Promise<{ products: ProductDto[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (availableOnly) filter.available = true;

  if (category) {
    const cat = await CategoryModel.findOne({ name: category }).lean();
    if (!cat) return { products: [], total: 0 };
    filter.categoryId = cat._id;
  }

  if (term.trim()) {
    const like = term.trim();
    filter.$or = [
      { name: { $regex: like, $options: 'i' } },
      { sku: { $regex: like, $options: 'i' } },
      { tags: { $elemMatch: { $regex: like, $options: 'i' } } },
    ];
  }

  const total = await ProductModel.countDocuments(filter);
  const rows = await ProductModel.find(filter).sort({ name: 1 }).limit(limit).lean();
  const categoryIds = [...new Set(rows.map((r) => String(r.categoryId)))];
  const cats = await CategoryModel.find({ _id: { $in: categoryIds } }).lean();
  const catMap = new Map(cats.map((c) => [String(c._id), String(c.name)]));

  return {
    products: rows.map((row) =>
      toProductDto(row as Record<string, unknown>, catMap.get(String(row.categoryId)) ?? ''),
    ),
    total,
  };
}

export async function getProduct(id: string): Promise<ProductDto | null> {
  const row = await ProductModel.findById(id).lean();
  if (!row) return null;
  const name = await categoryNameById(String(row.categoryId));
  return toProductDto(row as Record<string, unknown>, name);
}

export async function createProduct(input: {
  name: string;
  category: string;
  price: number;
  sku: string;
  tags?: string[];
  available?: boolean;
}): Promise<ProductDto> {
  let category = await CategoryModel.findOne({ name: input.category.trim() });
  if (!category) {
    category = await CategoryModel.create({ name: input.category.trim() });
  }
  const created = await ProductModel.create({
    name: input.name,
    categoryId: category._id,
    price: input.price,
    sku: input.sku,
    tags: input.tags ?? [],
    available: input.available !== false,
  });
  return toProductDto(created.toObject() as Record<string, unknown>, category.name);
}

export async function updateProduct(
  id: string,
  patch: Partial<{
    name: string;
    category: string;
    price: number;
    sku: string;
    tags: string[];
    available: boolean;
  }>,
): Promise<ProductDto | null> {
  const existing = await getProduct(id);
  if (!existing) return null;

  let categoryId: string | undefined;
  if (patch.category) {
    let category = await CategoryModel.findOne({ name: patch.category.trim() });
    if (!category) {
      category = await CategoryModel.create({ name: patch.category.trim() });
    }
    categoryId = String(category._id);
  } else {
    const row = await ProductModel.findById(id).lean();
    categoryId = row ? String(row.categoryId) : undefined;
  }

  const updated = await ProductModel.findByIdAndUpdate(
    id,
    {
      name: patch.name ?? existing.name,
      categoryId,
      price: patch.price ?? existing.price,
      sku: patch.sku ?? existing.sku,
      tags: patch.tags ?? existing.tags,
      available: patch.available ?? existing.available,
    },
    { new: true },
  ).lean();

  if (!updated) return null;
  const name = await categoryNameById(String(updated.categoryId));
  return toProductDto(updated as Record<string, unknown>, name);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const result = await ProductModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export async function listCategories(): Promise<string[]> {
  const rows = await CategoryModel.find().sort({ name: 1 }).lean();
  return rows.map((r) => String(r.name));
}

export async function listCategoryRecords(): Promise<Array<{ id: string; name: string }>> {
  const rows = await CategoryModel.find().sort({ name: 1 }).lean();
  return rows.map((r) => ({ id: String(r._id), name: String(r.name) }));
}

export async function createCategory(name: string): Promise<{ id: string; name: string }> {
  const created = await CategoryModel.create({ name: name.trim() });
  return { id: String(created._id), name: created.name };
}

export async function deleteCategory(id: string): Promise<boolean> {
  const used = await ProductModel.countDocuments({ categoryId: id });
  if (used > 0) return false;
  const result = await CategoryModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}
