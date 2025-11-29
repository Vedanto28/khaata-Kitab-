import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  page: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: 'ledger-add-transaction',
    target: '[data-tour="add-transaction-fab"]',
    title: 'Add Transaction',
    description: 'Add a new transaction quickly using this button.',
    page: '/ledger',
    position: 'top'
  },
  {
    id: 'ledger-scan-receipt',
    target: '[data-tour="scan-receipt"]',
    title: 'Scan Receipt',
    description: 'Scan receipts to auto-extract amount and category.',
    page: '/ledger',
    position: 'top'
  },
  {
    id: 'inventory-add-item',
    target: '[data-tour="add-inventory"]',
    title: 'Add Inventory',
    description: 'Add items to track stock and link them to transactions.',
    page: '/inventory',
    position: 'bottom'
  },
  {
    id: 'insights-credit-signal',
    target: '[data-tour="credit-signal"]',
    title: 'Credit Signal',
    description: 'AI analyzes your cashflow to generate your credit signal.',
    page: '/insights',
    position: 'bottom'
  },
  {
    id: 'goal-edit',
    target: '[data-tour="goal-edit"]',
    title: 'Monthly Goal',
    description: 'Update your monthly income goal from here.',
    page: '/ledger',
    position: 'left'
  }
];

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const guideCompleted = localStorage.getItem('guideCompleted');
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (!guideCompleted && isAuthenticated === 'true') {
      // Small delay to let the page render
      setTimeout(() => setIsActive(true), 500);
    }
  }, []);

  const startTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    completeTour();
  };

  const completeTour = () => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem('guideCompleted', 'true');
  };

  return (
    <TourContext.Provider
      value={{
        isActive,
        currentStep,
        steps: tourSteps,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
};
