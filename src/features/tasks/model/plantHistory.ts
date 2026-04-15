export interface PlantHistoryEntry {
  applications: number;
  lastCertified: string | null;
  currentStage: string;
  notes: string;
  contact: string;
  products: string[];
}

// Transitional placeholder data still used by the task dashboard modal.
export const plantHistory: Record<string, PlantHistoryEntry> = {
  'Brooklyn Bread Co.': {
    applications: 3,
    lastCertified: '2023-12-15',
    currentStage: 'NDA Review',
    notes: 'Long-standing client, typically smooth process',
    contact: 'Sarah Mitchell - Operations Manager',
    products: ['Artisan Breads', 'Pastries', 'Seasonal Items']
  },
  'Artisan Bakery': {
    applications: 1,
    lastCertified: null,
    currentStage: 'Contract Processing',
    notes: 'New client, first-time certification',
    contact: 'Michael Chen - Owner',
    products: ['Sourdough Breads', 'Organic Pastries']
  },
  'Metro Spice Company': {
    applications: 5,
    lastCertified: '2024-08-20',
    currentStage: 'Payment Follow-up',
    notes: 'Payment delays in past, requires follow-up',
    contact: 'Jennifer Rodriguez - Finance',
    products: ['Spice Blends', 'Seasoning Mixes', 'Organic Herbs']
  },
  'Happy Snacks': {
    applications: 2,
    lastCertified: '2024-01-10',
    currentStage: 'Certification Pending',
    notes: 'Quick turnaround expected',
    contact: 'David Park - Production Manager',
    products: ['Snack Bars', 'Dried Fruits', 'Nuts']
  }
};
