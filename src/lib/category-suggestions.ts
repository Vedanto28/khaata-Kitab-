// Simple keyword-based category suggestions

interface CategoryMap {
  [key: string]: string[];
}

const categoryKeywords: CategoryMap = {
  'Groceries': ['milk', 'sugar', 'rice', 'wheat', 'bread', 'vegetables', 'fruits', 'eggs', 'flour', 'oil', 'dal', 'tea', 'coffee', 'spices'],
  'Office Supplies': ['ink', 'paper', 'printer', 'pen', 'notebook', 'folder', 'stapler', 'clip', 'toner', 'cartridge'],
  'Business Operations': ['delivery', 'packing', 'transport', 'shipping', 'courier', 'freight', 'logistics'],
  'Utilities': ['electricity', 'water', 'internet', 'phone', 'mobile', 'broadband', 'wifi'],
  'Rent': ['rent', 'lease', 'rental'],
  'Fuel': ['petrol', 'diesel', 'gas', 'fuel', 'cng'],
  'Maintenance': ['repair', 'service', 'maintenance', 'fix'],
  'Salary': ['salary', 'wage', 'payment', 'income', 'earning'],
  'Sales': ['sale', 'sold', 'customer', 'order'],
};

export const suggestCategory = (description: string): string | null => {
  const lowerDesc = description.toLowerCase().trim();
  
  if (!lowerDesc || lowerDesc.length < 2) return null;
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return category;
      }
    }
  }
  
  return null;
};
