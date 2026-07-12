import { v4 as uuid } from 'uuid';
import { db } from '../db/database.js';
import type { ProductDto } from './domain.js';

function mapProduct(row: Record<string, unknown>): ProductDto {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category_name ?? row.category ?? ''),
    price: Number(row.price),
    sku: String(row.sku),
    tags: JSON.parse(String(row.tags || '[]')) as string[],
    available: Boolean(row.available),
  };
}

export function searchProducts(
  term: string,
  category?: string | null,
  limit = 40,
  availableOnly = true,
): { products: ProductDto[]; total: number } {
  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params: Array<string | number> = [];
  if (availableOnly) {
    sql += ' AND p.available = 1';
  }
  if (category) {
    sql += ' AND c.name = ?';
    params.push(category);
  }
  if (term.trim()) {
    sql += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.tags) LIKE ?)';
    const like = `%${term.trim().toLowerCase()}%`;
    params.push(like, like, like);
  }
  const countSql = `SELECT COUNT(*) as c FROM (${sql})`;
  const total = (db.prepare(countSql).get(...params) as { c: number }).c;
  sql += ' ORDER BY p.name ASC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return { products: rows.map(mapProduct), total };
}

export function getProduct(id: string): ProductDto | null {
  const row = db
    .prepare(
      `
    SELECT p.*, c.name as category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `,
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapProduct(row) : null;
}

export function createProduct(input: {
  name: string;
  category: string;
  price: number;
  sku: string;
  tags?: string[];
  available?: boolean;
}): ProductDto {
  let category = db.prepare('SELECT id, name FROM categories WHERE name = ?').get(input.category) as
    | { id: string; name: string }
    | undefined;
  if (!category) {
    const id = uuid();
    db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(id, input.category);
    category = { id, name: input.category };
  }
  const id = uuid();
  db.prepare(
    `INSERT INTO products (id, name, category_id, price, sku, tags, available) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    category.id,
    input.price,
    input.sku,
    JSON.stringify(input.tags ?? []),
    input.available === false ? 0 : 1,
  );
  return getProduct(id)!;
}

export function updateProduct(
  id: string,
  patch: Partial<{
    name: string;
    category: string;
    price: number;
    sku: string;
    tags: string[];
    available: boolean;
  }>,
): ProductDto | null {
  const existing = getProduct(id);
  if (!existing) return null;

  let categoryId = (
    db
      .prepare(
        `SELECT category_id FROM products WHERE id = ?`,
      )
      .get(id) as { category_id: string }
  ).category_id;

  if (patch.category) {
    let category = db.prepare('SELECT id FROM categories WHERE name = ?').get(patch.category) as
      | { id: string }
      | undefined;
    if (!category) {
      const newId = uuid();
      db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(newId, patch.category);
      category = { id: newId };
    }
    categoryId = category.id;
  }

  db.prepare(
    `
    UPDATE products
    SET name = ?, category_id = ?, price = ?, sku = ?, tags = ?, available = ?
    WHERE id = ?
  `,
  ).run(
    patch.name ?? existing.name,
    categoryId,
    patch.price ?? existing.price,
    patch.sku ?? existing.sku,
    JSON.stringify(patch.tags ?? existing.tags),
    (patch.available ?? existing.available) ? 1 : 0,
    id,
  );
  return getProduct(id);
}

export function deleteProduct(id: string): boolean {
  return db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0;
}

export function listCategories(): string[] {
  return (db.prepare('SELECT name FROM categories ORDER BY name').all() as Array<{ name: string }>).map((r) => r.name);
}

export function listCategoryRecords(): Array<{ id: string; name: string }> {
  return db.prepare('SELECT id, name FROM categories ORDER BY name').all() as Array<{ id: string; name: string }>;
}

export function createCategory(name: string): { id: string; name: string } {
  const id = uuid();
  db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(id, name.trim());
  return { id, name: name.trim() };
}

export function getCategory(id: string): { id: string; name: string } | null {
  const row = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id) as { id: string; name: string } | undefined;
  return row ?? null;
}

export function updateCategory(id: string, name: string): { id: string; name: string } | null {
  const changes = db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name.trim(), id).changes;
  if (changes === 0) return null;
  return getCategory(id);
}

export function deleteCategory(id: string): boolean {
  const used = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id = ?').get(id) as { c: number };
  if (used.c > 0) return false;
  return db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes > 0;
}
