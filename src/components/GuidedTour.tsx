import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useTour } from '@/contexts/TourContext';
import { TourTooltip } from './TourTooltip';

export const GuidedTour = () => {
  const { isActive, currentStep, steps, nextStep, prevStep, skipTour } = useTour();
  const location = useLocation();
  const navigate = useNavigate();

  const currentStepData = steps[currentStep];
  const isCurrentPageCorrect = location.pathname === currentStepData?.page;

  useEffect(() => {
    if (isActive && currentStepData && !isCurrentPageCorrect) {
      // Navigate to the correct page for this step
      navigate(currentStepData.page);
    }
  }, [isActive, currentStep, currentStepData, isCurrentPageCorrect, navigate]);

  // Don't show tooltip if we're not on the correct page or the target doesn't exist yet
  const shouldShowTooltip = isActive && isCurrentPageCorrect;

  useEffect(() => {
    if (shouldShowTooltip) {
      // Wait a bit for the page to render
      const timer = setTimeout(() => {
        const element = document.querySelector(currentStepData.target);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTooltip, currentStepData]);

  return (
    <AnimatePresence>
      {shouldShowTooltip && (
        <TourTooltip
          target={currentStepData.target}
          title={currentStepData.title}
          description={currentStepData.description}
          currentStep={currentStep}
          totalSteps={steps.length}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          position={currentStepData.position}
        />
      )}
    </AnimatePresence>
  );
};
