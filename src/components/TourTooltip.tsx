import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourTooltipProps {
  target: string;
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TourTooltip = ({
  target,
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  position = 'bottom'
}: TourTooltipProps) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(target);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 160;
      const spacing = 16;
      const arrowSize = 12;

      let top = 0;
      let left = 0;
      let arrowTop = 0;
      let arrowLeft = 0;
      let arrowRotate = 0;

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - spacing;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowTop = tooltipHeight - 2;
          arrowLeft = tooltipWidth / 2 - arrowSize / 2;
          arrowRotate = 180;
          break;
        case 'bottom':
          top = rect.bottom + spacing;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          arrowTop = -arrowSize + 2;
          arrowLeft = tooltipWidth / 2 - arrowSize / 2;
          arrowRotate = 0;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - spacing;
          arrowTop = tooltipHeight / 2 - arrowSize / 2;
          arrowLeft = tooltipWidth - 2;
          arrowRotate = 90;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + spacing;
          arrowTop = tooltipHeight / 2 - arrowSize / 2;
          arrowLeft = -arrowSize + 2;
          arrowRotate = -90;
          break;
      }

      // Ensure tooltip stays within viewport
      const padding = 16;
      if (left < padding) left = padding;
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipHeight > window.innerHeight - padding) {
        top = window.innerHeight - tooltipHeight - padding;
      }

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        zIndex: 9999
      });

      setArrowStyle({
        position: 'absolute',
        top: `${arrowTop}px`,
        left: `${arrowLeft}px`,
        width: `${arrowSize}px`,
        height: `${arrowSize}px`,
        transform: `rotate(${arrowRotate}deg)`
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [target, position]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
        onClick={onSkip}
      />

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={tooltipStyle}
        className="bg-[#FFF8E7] dark:bg-[#2D2417] border-2 border-[#E8D5B5] dark:border-[#4A3F2F] rounded-xl shadow-lg p-5"
      >
        {/* Arrow */}
        <div
          style={{
            ...arrowStyle,
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
          }}
          className="bg-[#FFF8E7] dark:bg-[#2D2417] border-2 border-[#E8D5B5] dark:border-[#4A3F2F] border-b-0 border-l-0"
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-[#2D2417] dark:text-[#FFF8E7]">
            {title}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1 hover:bg-[#E8D5B5] dark:hover:bg-[#4A3F2F]"
            onClick={onSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Description */}
        <p className="text-sm text-[#5D4E37] dark:text-[#D4C4A8] mb-4 leading-relaxed">
          {description}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-[#E8D5B5] dark:bg-[#4A3F2F]'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={currentStep === 0}
            className="border-[#E8D5B5] dark:border-[#4A3F2F] hover:bg-[#E8D5B5] dark:hover:bg-[#4A3F2F]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="hover:bg-[#E8D5B5] dark:hover:bg-[#4A3F2F]"
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={onNext}
              className="bg-primary hover:bg-primary/90"
            >
              {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
              {currentStep !== totalSteps - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
};
