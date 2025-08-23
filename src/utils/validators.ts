import { z } from 'zod';
import { UNITS, CURRENCIES } from '../data/constants';

export const ProductSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  unit: z.enum(UNITS as [string, ...string[]]),
  quantity: z.number().min(0, 'Quantity must be >= 0'),
  minStock: z.number().min(0, 'Min stock must be >= 0').optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export const SupplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export const SupplierPriceSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, 'Product is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  price: z.number().min(0.01, 'Price must be > 0'),
  currency: z.enum(CURRENCIES as [string, ...string[]]),
  lastUpdated: z.string().optional(),
  preferred: z.boolean().optional(),
});

export const TechCardSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product is required'),
    nettoQty: z.number().min(0, 'Quantity must be >= 0'),
    unit: z.enum(UNITS as [string, ...string[]]),
    yieldPct: z.number().min(0).max(1).optional(),
    notes: z.string().optional(),
  })),
  notes: z.string().optional(),
});

export type ProductFormData = z.infer<typeof ProductSchema>;
export type SupplierFormData = z.infer<typeof SupplierSchema>;
export type SupplierPriceFormData = z.infer<typeof SupplierPriceSchema>;
export type TechCardFormData = z.infer<typeof TechCardSchema>;
