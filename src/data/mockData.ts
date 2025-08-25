import type { Product, Supplier } from './types';
import { 
  createProduct, 
  createSupplier, 
  createSupplierPrice
} from './store';

const mockProducts: Omit<Product, 'id'>[] = [
  {
    sku: 'CHICK-001',
    name: 'Chicken Breast',
    unit: 'kg',
    quantity: 12,
    minStock: 5,
    category: 'Meat',
    notes: 'Fresh chicken breast, antibiotic-free'
  },
  {
    sku: 'FLOUR-002', 
    name: 'Wheat Flour 550',
    unit: 'kg',
    quantity: 40,
    minStock: 20,
    category: 'Dry',
    notes: 'Type 550 wheat flour for bread and pizza'
  },
  {
    sku: 'HOPS-003',
    name: 'Aroma Hops',
    unit: 'g', 
    quantity: 8000,
    minStock: 2000,
    category: 'Brew',
    notes: 'Cascade hops for IPA brewing'
  },
  {
    sku: 'BEEF-004',
    name: 'Beef Tenderloin',
    unit: 'kg',
    quantity: 5,
    minStock: 2,
    category: 'Meat',
    notes: 'Premium beef tenderloin'
  },
  {
    sku: 'SALT-005',
    name: 'Sea Salt',
    unit: 'kg',
    quantity: 25,
    minStock: 10,
    category: 'Spices',
    notes: 'Coarse sea salt'
  }
];

const mockSuppliers: Omit<Supplier, 'id'>[] = [
  {
    name: 'Foodlevel, UAB'
  },
  {
    name: 'Sanitex, UAB'
  },
  {
    name: 'LIDL, UAB'
  }
];

export async function seedData(): Promise<void> {
  // Create products
  const createdProducts: Product[] = [];
  for (const productData of mockProducts) {
    const product = await createProduct(productData);
    createdProducts.push(product);
  }

  // Create suppliers  
  const createdSuppliers: Supplier[] = [];
  for (const supplierData of mockSuppliers) {
    const supplier = await createSupplier(supplierData);
    createdSuppliers.push(supplier);
  }

  // Create supplier prices
  if (createdProducts.length > 0 && createdSuppliers.length > 0) {
    const chickenProduct = createdProducts.find(p => p.sku === 'CHICK-001');
    const beefProduct = createdProducts.find(p => p.sku === 'BEEF-004');
    const flourProduct = createdProducts.find(p => p.sku === 'FLOUR-002');
    const hopsProduct = createdProducts.find(p => p.sku === 'HOPS-003');
    const saltProduct = createdProducts.find(p => p.sku === 'SALT-005');
    
    const foodlevel = createdSuppliers.find(s => s.name === 'Foodlevel, UAB');
    const sanitex = createdSuppliers.find(s => s.name === 'Sanitex, UAB');
    const lidl = createdSuppliers.find(s => s.name === 'LIDL, UAB');

    if (chickenProduct && foodlevel && lidl) {
      // Chicken prices from two suppliers
      await createSupplierPrice({
        productId: chickenProduct.id,
        supplierId: foodlevel.id,
        price: 8.50,
        currency: 'EUR',
        preferred: true
      });
      
      await createSupplierPrice({
        productId: chickenProduct.id,
        supplierId: lidl.id,
        price: 9.20,
        currency: 'EUR'
      });
    }

    if (beefProduct && foodlevel) {
      await createSupplierPrice({
        productId: beefProduct.id,
        supplierId: foodlevel.id,
        price: 28.50,
        currency: 'EUR',
        preferred: true
      });
    }

    if (flourProduct && lidl) {
      await createSupplierPrice({
        productId: flourProduct.id,
        supplierId: lidl.id,
        price: 0.85,
        currency: 'EUR',
        preferred: true
      });
    }

    if (hopsProduct && foodlevel) {
      await createSupplierPrice({
        productId: hopsProduct.id,
        supplierId: foodlevel.id,
        price: 0.045, // 45€ per kg = 0.045€ per gram
        currency: 'EUR',
        preferred: true
      });
    }

    if (saltProduct && sanitex && lidl) {
      await createSupplierPrice({
        productId: saltProduct.id,
        supplierId: sanitex.id,
        price: 1.20,
        currency: 'EUR',
        preferred: true
      });
      
      await createSupplierPrice({
        productId: saltProduct.id,
        supplierId: lidl.id,
        price: 1.35,
        currency: 'EUR'
      });
    }
  }
}
