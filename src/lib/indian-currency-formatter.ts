// Indian Number Formatting System
// Formats: 10,000 | 1,00,000 | 10,00,000 | 1,00,00,000

export const formatIndianCurrency = (value: string | number): string => {
  const numStr = value.toString().replace(/[^\d]/g, '');
  
  if (!numStr || numStr === '0') return '';
  
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return '';
  
  // Indian numbering: first 3 digits, then groups of 2
  const formatted = num.toLocaleString('en-IN');
  return formatted;
};

export const parseIndianCurrency = (formatted: string): number => {
  const cleaned = formatted.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
};

// Hook for input with Indian formatting
export const useIndianCurrencyInput = (initialValue: string = '') => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const formatted = formatIndianCurrency(rawValue);
    return { raw: rawValue, formatted };
  };

  return { handleChange, format: formatIndianCurrency, parse: parseIndianCurrency };
};
