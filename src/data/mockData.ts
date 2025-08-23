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
    name: 'Baltic Foods UAB',
    email: 'sales@bfoods.lt',
    phone: '+370 5 123 4567'
  },
  {
    name: 'FreshPro LT',
    email: 'hello@freshpro.lt', 
    phone: '+370 6 987 6543'
  },
  {
    name: 'Brewmaster Supplies',
    email: 'orders@brewmaster.eu',
    phone: '+370 5 555 0123'
  }
];

export function seedData(): void {
  // Create products
  const createdProducts: Product[] = [];
  mockProducts.forEach(productData => {
    createdProducts.push(createProduct(productData));
  });

  // Create suppliers  
  const createdSuppliers: Supplier[] = [];
  mockSuppliers.forEach(supplierData => {
    createdSuppliers.push(createSupplier(supplierData));
  });

  // Create supplier prices
  if (createdProducts.length > 0 && createdSuppliers.length > 0) {
    const chickenProduct = createdProducts.find(p => p.sku === 'CHICK-001');
    const beefProduct = createdProducts.find(p => p.sku === 'BEEF-004');
    const flourProduct = createdProducts.find(p => p.sku === 'FLOUR-002');
    const hopsProduct = createdProducts.find(p => p.sku === 'HOPS-003');
    const saltProduct = createdProducts.find(p => p.sku === 'SALT-005');
    
    const balticFoods = createdSuppliers.find(s => s.name === 'Baltic Foods UAB');
    const freshPro = createdSuppliers.find(s => s.name === 'FreshPro LT');
    const brewmaster = createdSuppliers.find(s => s.name === 'Brewmaster Supplies');

    if (chickenProduct && balticFoods && freshPro) {
      // Chicken prices from two suppliers
      createSupplierPrice({
        productId: chickenProduct.id,
        supplierId: balticFoods.id,
        price: 8.50,
        currency: 'EUR',
        preferred: true
      });
      
      createSupplierPrice({
        productId: chickenProduct.id,
        supplierId: freshPro.id,
        price: 9.20,
        currency: 'EUR'
      });
    }

    if (beefProduct && freshPro) {
      createSupplierPrice({
        productId: beefProduct.id,
        supplierId: freshPro.id,
        price: 28.50,
        currency: 'EUR',
        preferred: true
      });
    }

    if (flourProduct && balticFoods) {
      createSupplierPrice({
        productId: flourProduct.id,
        supplierId: balticFoods.id,
        price: 0.85,
        currency: 'EUR',
        preferred: true
      });
    }

    if (hopsProduct && brewmaster) {
      createSupplierPrice({
        productId: hopsProduct.id,
        supplierId: brewmaster.id,
        price: 0.045, // 45€ per kg = 0.045€ per gram
        currency: 'EUR',
        preferred: true
      });
    }

    if (saltProduct && balticFoods && freshPro) {
      createSupplierPrice({
        productId: saltProduct.id,
        supplierId: balticFoods.id,
        price: 1.20,
        currency: 'EUR',
        preferred: true
      });
      
      createSupplierPrice({
        productId: saltProduct.id,
        supplierId: freshPro.id,
        price: 1.35,
        currency: 'EUR'
      });
    }
  }
}
