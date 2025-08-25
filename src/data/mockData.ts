import type { Supplier } from './types';
import { 
  createSupplier
} from './store';

// No mock products - using database only

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
  // Create suppliers only - no mock products
  const createdSuppliers: Supplier[] = [];
  for (const supplierData of mockSuppliers) {
    const supplier = await createSupplier(supplierData);
    createdSuppliers.push(supplier);
  }
  
  console.log(`Seeded ${createdSuppliers.length} suppliers:`, 
    createdSuppliers.map(s => s.name).join(', '));
}
