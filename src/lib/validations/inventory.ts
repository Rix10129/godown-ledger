import { z } from "zod";

// ── Product ───────────────────────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  genericName: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  subUnit: z.string().optional(),
  unitsPerPack: z.coerce.number().int().positive().optional(),
  salePrice: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(10),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  description: z.string().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

// ── Batch ─────────────────────────────────────────────────────────────────────

export const batchSchema = z.object({
  batchNumber: z.string().min(1, "Batch number is required"),
  manufactureDate: z.string().optional(),
  expiryDate: z.string().optional(),
  purchasePrice: z.coerce
    .number()
    .positive("Purchase price must be greater than 0"),
  salePrice: z.coerce.number().positive("Sale price must be greater than 0"),
  quantity: z.coerce.number().positive().multipleOf(0.001),
});

export type BatchInput = z.infer<typeof batchSchema>;

export const batchPriceUpdateSchema = z.object({
  purchasePrice: z.coerce
    .number()
    .positive("Purchase price must be greater than 0"),
  salePrice: z.coerce.number().positive("Sale price must be greater than 0"),
});

export type BatchPriceUpdateInput = z.infer<typeof batchPriceUpdateSchema>;

// ── Stock Adjustment ──────────────────────────────────────────────────────────

export const stockAdjustSchema = z.object({
  batchId: z.string().min(1),
  quantity: z.coerce.number().multipleOf(0.001),
  notes: z.string().optional(),
});

export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
