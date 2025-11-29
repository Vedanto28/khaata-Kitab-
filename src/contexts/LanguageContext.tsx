import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'hi' | 'mr' | 'ta' | 'es' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.ledger': 'Ledger',
    'nav.inventory': 'Inventory',
    'nav.insights': 'Insights',
    'nav.profile': 'Profile',
    
    // Ledger
    'ledger.title': 'My Ledger',
    'ledger.balance': 'Current Balance',
    'ledger.income': 'Income',
    'ledger.expense': 'Expense',
    'ledger.addEntry': 'Add Entry',
    'ledger.search': 'Search transactions...',
    'ledger.all': 'All',
    'ledger.noTransactions': 'No transactions yet',
    'ledger.startMessage': 'Add your first entry or scan a receipt to get started',
    
    // Transaction
    'transaction.edit': 'Edit',
    'transaction.verify': 'Verify',
    'transaction.verified': 'Verified',
    'transaction.manual': 'Manual',
    'transaction.sms': 'SMS',
    'transaction.receipt': 'Receipt',
    
    // Add Transaction
    'add.title': 'Add Transaction',
    'add.type': 'Type',
    'add.amount': 'Amount',
    'add.description': 'Description',
    'add.category': 'Category',
    'add.selectCategory': 'Select category',
    'add.inventoryLink': 'Link to Inventory (Optional)',
    'add.selectItem': 'Select Item',
    'add.quantity': 'Quantity',
    'add.quantityAdded': 'Quantity Added',
    'add.quantitySold': 'Quantity Sold',
    'add.submit': 'Add Transaction',
    
    // Edit Transaction
    'edit.title': 'Edit Transaction',
    'edit.submit': 'Update Transaction',
    
    // Profile
    'profile.title': 'Profile & Settings',
    'profile.subtitle': 'Manage your app preferences',
    'profile.privacy': 'Privacy & Permissions',
    'profile.theme': 'Dark Mode',
    'profile.themeDesc': 'Switch between light and dark theme',
    'profile.language': 'Language',
    'profile.languageDesc': 'Change app language',
    'profile.sms': 'SMS Reading',
    'profile.smsDesc': 'Allow app to read payment SMS for automatic entry',
    'profile.dataManagement': 'Data Management',
    'profile.export': 'Export Data (JSON)',
    'profile.clear': 'Clear All Data',
    'profile.about': 'About',
    'profile.version': 'App Version',
    'profile.storage': 'Storage Used',
    'profile.storageValue': 'On-device only',
    'profile.privacyStatus': 'Privacy',
    'profile.privacyValue': '100% Offline',
    'profile.appName': 'KhaataKitab',
    'profile.tagline': 'Your private, AI-powered bookkeeping assistant',
    
    // Categories
    'category.sales': 'Sales',
    'category.salary': 'Salary',
    'category.refund': 'Refund',
    'category.otherIncome': 'Other Income',
    'category.food': 'Food & Grocery',
    'category.utilities': 'Utilities',
    'category.rent': 'Rent',
    'category.transport': 'Transport',
    'category.supplies': 'Supplies',
    'category.otherExpense': 'Other Expense',
    
    // Inventory
    'inventory.title': 'Inventory',
    'inventory.addItem': 'Add Item',
    'inventory.totalValue': 'Total Value',
    'inventory.totalStock': 'Total Stock',
    'inventory.noItems': 'No inventory items yet',
    'inventory.startMessage': 'Add your first item to get started',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.success': 'Success',
    'common.error': 'Error',
  },
  hi: {
    'nav.ledger': 'खाता',
    'nav.inventory': 'इन्वेंटरी',
    'nav.insights': 'अंतर्दृष्टि',
    'nav.profile': 'प्रोफ़ाइल',
    'ledger.title': 'मेरा खाता',
    'ledger.balance': 'वर्तमान शेष',
    'ledger.income': 'आय',
    'ledger.expense': 'व्यय',
    'ledger.addEntry': 'प्रविष्टि जोड़ें',
    'ledger.search': 'लेनदेन खोजें...',
    'ledger.all': 'सभी',
    'profile.title': 'प्रोफ़ाइल और सेटिंग्स',
    'profile.theme': 'डार्क मोड',
    'profile.language': 'भाषा',
    'add.title': 'लेनदेन जोड़ें',
    'edit.title': 'लेनदेन संपादित करें',
  },
  mr: {
    'nav.ledger': 'खातेवही',
    'nav.inventory': 'इन्व्हेंटरी',
    'nav.insights': 'अंतर्दृष्टी',
    'nav.profile': 'प्रोफाइल',
    'ledger.title': 'माझे खातेवही',
    'ledger.balance': 'सध्याची शिल्लक',
    'ledger.income': 'उत्पन्न',
    'ledger.expense': 'खर्च',
    'ledger.addEntry': 'नोंद जोडा',
    'ledger.search': 'व्यवहार शोधा...',
    'profile.title': 'प्रोफाइल आणि सेटिंग्ज',
    'profile.theme': 'गडद मोड',
    'profile.language': 'भाषा',
  },
  ta: {
    'nav.ledger': 'கணக்கு',
    'nav.inventory': 'சரக்கு',
    'nav.insights': 'நுண்ணறிவு',
    'nav.profile': 'சுயவிவரம்',
    'ledger.title': 'என் கணக்கு',
    'ledger.balance': 'தற்போதைய இருப்பு',
    'ledger.income': 'வருமானம்',
    'ledger.expense': 'செலவு',
    'ledger.addEntry': 'பதிவு சேர்க்கவும்',
    'ledger.search': 'பரிவர்த்தனைகளைத் தேடுங்கள்...',
    'profile.title': 'சுயவிவரம் & அமைப்புகள்',
    'profile.theme': 'இருண்ட பயன்முறை',
    'profile.language': 'மொழி',
  },
  es: {
    'nav.ledger': 'Libro Mayor',
    'nav.inventory': 'Inventario',
    'nav.insights': 'Perspectivas',
    'nav.profile': 'Perfil',
    'ledger.title': 'Mi Libro Mayor',
    'ledger.balance': 'Saldo Actual',
    'ledger.income': 'Ingreso',
    'ledger.expense': 'Gasto',
    'ledger.addEntry': 'Añadir Entrada',
    'ledger.search': 'Buscar transacciones...',
    'profile.title': 'Perfil y Configuración',
    'profile.theme': 'Modo Oscuro',
    'profile.language': 'Idioma',
  },
  fr: {
    'nav.ledger': 'Grand Livre',
    'nav.inventory': 'Inventaire',
    'nav.insights': 'Aperçus',
    'nav.profile': 'Profil',
    'ledger.title': 'Mon Grand Livre',
    'ledger.balance': 'Solde Actuel',
    'ledger.income': 'Revenu',
    'ledger.expense': 'Dépense',
    'ledger.addEntry': 'Ajouter une Entrée',
    'ledger.search': 'Rechercher des transactions...',
    'profile.title': 'Profil et Paramètres',
    'profile.theme': 'Mode Sombre',
    'profile.language': 'Langue',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const t = (key: string): string => {
    const translation = translations[language][key];
    return translation || translations.en[key] || key;
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
