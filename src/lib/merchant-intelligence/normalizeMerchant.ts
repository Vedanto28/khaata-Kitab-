import { merchantDictionary } from './merchantDictionary';

export interface NormalizedMerchant {
  canonicalName: string;
  category: string;
  confidence: number;
  isMatched: boolean;
}

export function normalizeMerchant(rawMerchant: string): NormalizedMerchant {
  if (!rawMerchant) {
    return {
      canonicalName: "Other",
      category: "Other Expense",
      confidence: 0.1,
      isMatched: false
    };
  }

  // 1. Lowercase matching and cleaning
  let cleaned = rawMerchant.toLowerCase();
  
  // Replace punctuation with spaces
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
  
  // Suffixes and corporate stopwords common in bank transactions
  const stopwords = [
    "limited", "ltd", "private", "pvt", "india", "payment", "payments", 
    "pay", "store", "stores", "mktplace", "marketplace", "online", 
    "services", "service", "retail", "tech", "technology", "technologies",
    "limited", "ltd", "corp", "corporation", "co", "company"
  ];
  
  // Split into tokens
  let tokens = cleaned.split(/\s+/).filter(t => t.length > 0);
  
  // Filter out stopwords
  tokens = tokens.filter(t => !stopwords.includes(t));
  
  // Reconstruct cleaned string
  const cleanedStr = tokens.join(" ").trim();
  
  // 2. Direct lookup / exact matching on cleaned string
  if (merchantDictionary[cleanedStr]) {
    const matched = merchantDictionary[cleanedStr];
    return {
      canonicalName: matched.canonicalName,
      category: matched.category,
      confidence: 1.0,
      isMatched: true
    };
  }

  // 3. Keyword / contains matching
  // Sort keys by length descending to match Swiggy Instamart before Swiggy
  const sortedKeys = Object.keys(merchantDictionary).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    // Check if the cleaned raw merchant contains the dictionary key, or vice-versa
    if (cleanedStr.includes(key) || (key.includes(cleanedStr) && cleanedStr.length >= 3)) {
      const matched = merchantDictionary[key];
      const confidence = cleanedStr === key ? 1.0 : 0.9;
      return {
        canonicalName: matched.canonicalName,
        category: matched.category,
        confidence,
        isMatched: true
      };
    }
  }

  // 4. Fallback to title casing the cleaned raw merchant if no match is found
  const capitalized = cleanedStr
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    canonicalName: capitalized || rawMerchant,
    category: "Other Expense",
    confidence: 0.2,
    isMatched: false
  };
}
