import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AppLockScreenProps {
  onUnlock: () => void;
}

export const AppLockScreen = ({ onUnlock }: AppLockScreenProps) => {
  const [pin, setPin] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState('');
  const lockType = localStorage.getItem('appLockType') || 'pin';
  const savedPin = localStorage.getItem('appLockPin') || '1234';

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === savedPin) {
            toast.success('Unlocked!');
            onUnlock();
          } else {
            toast.error('Wrong PIN');
            setPin('');
          }
        }, 100);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleForgotPin = () => {
    if (email) {
      toast.success('Reset link sent to ' + email);
      setShowForgot(false);
      setEmail('');
    } else {
      toast.error('Please enter your email');
    }
  };

  if (showForgot) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm px-4"
        >
          <Card className="p-6 space-y-4">
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h2 className="text-xl font-bold mb-2">Forgot PIN?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your email to receive a reset link
              </p>
            </div>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForgot(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleForgotPin} className="flex-1">
                Send Link
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm px-4"
      >
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Enter PIN</h2>
            <p className="text-sm text-muted-foreground">Enter your 4-digit PIN to unlock</p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                  pin.length > i ? 'bg-primary border-primary' : 'border-border'
                }`}
                animate={{ scale: pin.length === i ? 1.1 : 1 }}
                transition={{ duration: 0.15 }}
              >
                {pin.length > i && <div className="w-3 h-3 rounded-full bg-primary-foreground" />}
              </motion.div>
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-16 text-xl"
                onClick={() => handlePinInput(num.toString())}
              >
                {num}
              </Button>
            ))}
            <Button variant="ghost" className="h-16" onClick={handleBackspace}>
              ⌫
            </Button>
            <Button
              variant="outline"
              className="h-16 text-xl"
              onClick={() => handlePinInput('0')}
            >
              0
            </Button>
            <div />
          </div>

          <Button
            variant="link"
            className="w-full text-sm"
            onClick={() => setShowForgot(true)}
          >
            Forgot PIN?
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};
