import { useState, useEffect } from 'react';
import { Lock, Smartphone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export const AppLockSettings = () => {
  const [lockEnabled, setLockEnabled] = useState(
    localStorage.getItem('appLockEnabled') === 'true'
  );
  const [showSetup, setShowSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleToggleLock = (enabled: boolean) => {
    if (enabled) {
      setShowSetup(true);
    } else {
      localStorage.setItem('appLockEnabled', 'false');
      setLockEnabled(false);
      toast.success('App Lock disabled');
    }
  };

  const handleSetupPin = () => {
    if (!pin || pin.length !== 4) {
      toast.error('PIN must be 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }

    localStorage.setItem('appLockEnabled', 'true');
    localStorage.setItem('appLockType', 'pin');
    localStorage.setItem('appLockPin', pin);
    setLockEnabled(true);
    setShowSetup(false);
    setPin('');
    setConfirmPin('');
    toast.success('App Lock enabled!');
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">App Lock</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">Enable App Lock</p>
              <p className="text-sm text-muted-foreground">
                Secure your app with a PIN
              </p>
            </div>
            <Switch checked={lockEnabled} onCheckedChange={handleToggleLock} />
          </div>

          {lockEnabled && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowSetup(true)}
            >
              Change PIN
            </Button>
          )}
        </div>
      </Card>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Set Up PIN
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Enter 4-digit PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirm PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <Button onClick={handleSetupPin} className="w-full" size="lg">
              Save PIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
