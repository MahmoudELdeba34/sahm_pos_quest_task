import { Order } from '../models/order.model';
import { Product } from '../models/product.model';

export const SEED_ORDERS: readonly Order[] = [
  {
    id: 'ord-1001',
    number: 'A-1042',
    channel: 'walk-in',
    status: 'received',
    priority: 'normal',
    customerName: 'Ahmed Hassan',
    tableNumber: '12',
    items: [
      { id: 'i1', name: 'Grilled Chicken Plate', quantity: 2, unitPrice: 145, allergens: ['sesame'] },
      { id: 'i2', name: 'Fresh Lemonade', quantity: 2, unitPrice: 35 },
    ],
    total: 360,
    createdAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    estimatedMinutes: 18,
    isDelayed: false,
  },
  {
    id: 'ord-1002',
    number: 'D-2201',
    channel: 'delivery',
    status: 'preparing',
    priority: 'high',
    customerName: 'Sara Mahmoud',
    deliveryAddress: 'Nasr City, St. 9, Bldg 14',
    items: [
      { id: 'i3', name: 'Beef Burger Combo', quantity: 1, unitPrice: 165, allergens: ['gluten', 'dairy'] },
      { id: 'i4', name: 'Spicy Fries', quantity: 1, unitPrice: 45 },
      { id: 'i5', name: 'Cola', quantity: 1, unitPrice: 25 },
    ],
    total: 235,
    createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    estimatedMinutes: 25,
    isDelayed: false,
  },
  {
    id: 'ord-1003',
    number: 'O-3310',
    channel: 'online',
    status: 'ready',
    priority: 'urgent',
    customerName: 'Omar Farouk',
    items: [
      { id: 'i6', name: 'Seafood Pasta', quantity: 1, unitPrice: 190, allergens: ['shellfish', 'gluten'], notes: 'No garlic' },
      { id: 'i7', name: 'Garlic Bread', quantity: 1, unitPrice: 40, allergens: ['gluten', 'dairy'] },
    ],
    total: 230,
    createdAt: new Date(Date.now() - 28 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    estimatedMinutes: 20,
    isDelayed: true,
  },
  {
    id: 'ord-1004',
    number: 'A-1043',
    channel: 'walk-in',
    status: 'preparing',
    priority: 'normal',
    customerName: 'Nour El-Din',
    tableNumber: '7',
    items: [
      { id: 'i8', name: 'Caesar Salad', quantity: 1, unitPrice: 95, allergens: ['dairy', 'eggs'] },
      { id: 'i9', name: 'Iced Tea', quantity: 1, unitPrice: 30 },
    ],
    total: 125,
    createdAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    estimatedMinutes: 12,
    isDelayed: false,
  },
  {
    id: 'ord-1005',
    number: 'D-2202',
    channel: 'delivery',
    status: 'received',
    priority: 'high',
    customerName: 'Layla Ibrahim',
    deliveryAddress: 'Heliopolis, Cleopatra St.',
    items: [
      { id: 'i10', name: 'Family Meal Box', quantity: 1, unitPrice: 420 },
      { id: 'i11', name: 'Chocolate Cake', quantity: 1, unitPrice: 75, allergens: ['dairy', 'eggs', 'gluten'] },
    ],
    total: 495,
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    estimatedMinutes: 35,
    isDelayed: false,
  },
];

const CATEGORIES = ['Mains', 'Burgers', 'Pasta', 'Salads', 'Sides', 'Drinks', 'Desserts'] as const;
const BASE_NAMES = [
  'Grilled Chicken', 'Beef Burger', 'Chicken Wrap', 'Seafood Pasta', 'Margherita Pizza',
  'Caesar Salad', 'French Fries', 'Onion Rings', 'Lemonade', 'Iced Tea', 'Cola',
  'Chocolate Cake', 'Cheesecake', 'Falafel Plate', 'Shawarma Bowl', 'Mushroom Soup',
  'Steak Sandwich', 'Veggie Bowl', 'Garlic Bread', 'Hummus Plate', 'Koshary Bowl',
  'Molokhia Plate', 'Grilled Salmon', 'Chicken Nuggets', 'Milkshake', 'Espresso',
  'Affogato', 'Tiramisu', 'Greek Salad', 'Club Sandwich',
];

function buildProducts(): Product[] {
  const products: Product[] = [];
  let index = 1;
  for (const name of BASE_NAMES) {
    for (let variant = 1; variant <= 8; variant++) {
      const category = CATEGORIES[index % CATEGORIES.length];
      products.push({
        id: `prd-${index}`,
        name: variant === 1 ? name : `${name} ${variant > 4 ? 'Deluxe' : 'Classic'}`,
        category,
        price: 25 + ((index * 17) % 200),
        sku: `SKU-${1000 + index}`,
        tags: [category.toLowerCase(), name.split(' ')[0].toLowerCase()],
        available: index % 17 !== 0,
      });
      index += 1;
    }
  }
  return products;
}

export const SEED_PRODUCTS: readonly Product[] = buildProducts();
