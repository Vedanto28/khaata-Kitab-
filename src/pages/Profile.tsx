import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';
import { BottomNav } from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Download, Trash2, Shield, Moon, Sun, Globe, LogOut } from 'lucide-react';
import { requestSMSPermission } from '@/lib/sms-reader';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLockSettings } from '@/components/AppLockSettings';

export default function Profile() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout } = useAuth();
  const settings = useLiveQuery(() => db.settings.toArray(), []);
  const [smsEnabled, setSmsEnabled] = useState(settings?.[0]?.smsPermissionGranted || false);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      toast.success('Logged out successfully');
      navigate('/');
    }
  };

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिंदी (Hindi)' },
    { value: 'mr', label: 'मराठी (Marathi)' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'es', label: 'Español (Spanish)' },
    { value: 'fr', label: 'Français (French)' },
  ];

  const handleSMSToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestSMSPermission();
      if (granted) {
        setSmsEnabled(true);
        if (settings?.[0]?.id) {
          await db.settings.update(settings[0].id, { smsPermissionGranted: true });
        }
        toast.success('SMS permission granted');
      } else {
        toast.error('SMS permission denied');
      }
    } else {
      setSmsEnabled(false);
      if (settings?.[0]?.id) {
        await db.settings.update(settings[0].id, { smsPermissionGranted: false });
      }
    }
  };

  const handleExportData = async () => {
    const transactions = await db.transactions.toArray();
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'khaatakitab-export.json';
    link.click();
    toast.success('Data exported successfully');
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      await db.transactions.clear();
      await db.receipts.clear();
      toast.success('All data cleared');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 rounded-b-3xl shadow-lg mb-6">
        <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
        <p className="text-sm opacity-90 mt-1">{t('profile.subtitle')}</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Appearance Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <h3 className="text-lg font-semibold">Appearance</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{t('profile.theme')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('profile.themeDesc')}
                </p>
              </div>
              <Switch 
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">{t('profile.language')}</Label>
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {t('profile.languageDesc')}
              </p>
            </div>
          </div>
        </Card>

        {/* SMS Automation Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">SMS Automation</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{t('profile.sms')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('profile.smsDesc')}
                </p>
              </div>
              <Switch 
                checked={smsEnabled}
                onCheckedChange={handleSMSToggle}
              />
            </div>

            {smsEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-success/10 rounded-lg border border-success/20"
              >
                <div className="flex items-center gap-2 text-success mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium text-sm">SMS Automation Active</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Financial SMS are automatically converted to transactions</p>
                  <p>• Categories are suggested using AI</p>
                  <p>• Low confidence transactions appear in "Needs Review"</p>
                </div>
                <div className="mt-3 pt-3 border-t border-success/20">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Last sync:</span>{' '}
                    {localStorage.getItem('lastSmsSyncTime') 
                      ? new Date(localStorage.getItem('lastSmsSyncTime')!).toLocaleString() 
                      : 'Never'}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Your data never leaves your device. All processing happens locally for maximum privacy.
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* App Lock Settings */}
        <AppLockSettings />

        {/* Data Management */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('profile.dataManagement')}</h3>

          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleExportData}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('profile.export')}
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleClearData}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('profile.clear')}
            </Button>

            <Button 
              variant="destructive" 
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </Card>

        {/* About */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('profile.about')}</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('profile.version')}</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('profile.storage')}</span>
              <span className="font-medium">{t('profile.storageValue')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('profile.privacyStatus')}</span>
              <span className="font-medium">{t('profile.privacyValue')}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-center">
              <strong className="text-primary">{t('profile.appName')}</strong>
              <br />
              <span className="text-muted-foreground">
                {t('profile.tagline')}
              </span>
            </p>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
