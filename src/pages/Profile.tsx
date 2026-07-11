import { useState, useEffect } from 'react';
import { SEO } from '@/components/common/SEO';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/database/db';
import { BottomNav } from '@/components/common/BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MessageSquare, Download, Trash2, Shield, Moon, Sun, Globe, LogOut } from 'lucide-react';
import { requestSMSPermission, initSMSAutomation } from '@/services/sms/smsReader';
import { toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, Language } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { AppLockSettings } from '@/components/authentication/AppLockSettings';

export default function Profile() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { logout } = useAuth();
  
  const settings = useLiveQuery(() => db.settings.toArray(), []);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showDev, setShowDev] = useState(false);
  const [devExpanded, setDevExpanded] = useState(false);

  // Sync smsEnabled with DB settings when loaded
  useEffect(() => {
    if (settings && settings.length > 0) {
      setSmsEnabled(settings[0].smsPermissionGranted || false);
    }
  }, [settings]);
  
  const transactions = useLiveQuery(() => db.transactions.toArray(), []);
  
  // Calculate SMS stats for demonstration/testing dashboard
  const smsTransactions = transactions?.filter(t => t.source === 'sms') || [];
  const smsSaved = smsTransactions.length;
  const smsDiscarded = parseInt(localStorage.getItem('khaataKitab_smsDiscarded') || '0');
  const duplicateBlocked = parseInt(localStorage.getItem('khaataKitab_duplicatesRemoved') || '0');
  const smsProcessedTotal = smsSaved + smsDiscarded + duplicateBlocked;
  
  const parserSuccessCount = smsTransactions.filter(t => t.amount !== null && t.amount > 0).length;
  const parserSuccessRate = smsSaved > 0 ? Math.round((parserSuccessCount / smsSaved) * 100) : 0;
  
  const categorizationSuccessCount = smsTransactions.filter(t => t.category !== 'General Expense' && t.category !== 'Other Expense').length;
  const categorizationSuccessRate = smsSaved > 0 ? Math.round((categorizationSuccessCount / smsSaved) * 100) : 0;

  const needsReviewCount = smsTransactions.filter(t => t.needsReview).length;
  const avgConfidence = smsTransactions.length > 0 
    ? Math.round((smsTransactions.reduce((sum, t) => sum + (t.confidence || 0), 0) / smsTransactions.length) * 100) 
    : 0;

  // Top Categories distribution
  const categoryCounts: Record<string, number> = {};
  smsTransactions.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Top Merchants distribution
  const merchantCounts: Record<string, number> = {};
  smsTransactions.forEach(t => {
    merchantCounts[t.description] = (merchantCounts[t.description] || 0) + 1;
  });
  const topMerchants = Object.entries(merchantCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Demo Health diagnostic statuses based on actual application state
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const classifierStats = localStorage.getItem('sms_classifier_model');
  const hasClassifierData = classifierStats ? JSON.parse(classifierStats).totalDocuments > 0 : false;
  
  const healthStatus = {
    receiptSystem: isSupabaseConfigured ? '✓ Operational' : '⚠ Requires Attention',
    smsSystem: smsEnabled ? '✓ Operational' : '⚠ Requires Attention',
    aiCategorization: (hasClassifierData || topCategories.length > 0) ? '✓ Operational' : '⚠ Requires Attention',
    ledgerStorage: transactions !== undefined ? '✓ Operational' : '⚠ Requires Attention',
    insightsEngine: (transactions && transactions.length > 0) ? '✓ Operational' : '⚠ Requires Attention'
  };

  const handleResetDemoData = async () => {
    if (confirm('Are you sure you want to reset all demo data, ML learning models, and SMS metrics? This cannot be undone.')) {
      const toastId = toast.loading('Resetting demo data...');
      try {
        // 1. Reset SMS diagnostics in localStorage
        localStorage.removeItem('khaataKitab_duplicatesRemoved');
        localStorage.removeItem('khaataKitab_smsDiscarded');
        localStorage.removeItem('khaataKitab_smsSaved');
        localStorage.removeItem('khaataKitab_processedSMS'); // clear processed SMS IDs
        localStorage.removeItem('lastSmsSyncTime');
        localStorage.removeItem('demoSmsImported');
        
        // 2. Clear SMS transactions from database
        const smsTxns = await db.transactions.where('source').equals('sms').toArray();
        const smsIds = smsTxns.map(t => t.id).filter((id): id is number => id !== undefined);
        if (smsIds.length > 0) {
          await db.transactions.bulkDelete(smsIds);
        }
        
        // 3. Clear classifier learning data
        localStorage.removeItem('sms_classifier_model');
        await db.categoryMappings.clear();
        
        // Retrain Naive Bayes classifier from keywords
        const { classifier } = await import('@/lib/ml/classifier');
        await classifier.reset();
        
        toast.success('Demo data and ML model reset successfully', { id: toastId });
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        console.error('Failed to reset demo data:', err);
        toast.error('Failed to reset demo data', { id: toastId });
      }
    }
  };

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
        
        // Native: Trigger historical read on manual enable
        const { isNative, readSMSMessages } = await import('@/services/sms/androidSmsPlugin');
        if (isNative()) {
          await readSMSMessages(100, 7);
        }
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
    <>
      <SEO title="Profile | KhaataKitab" description="Manage your KhaataKitab account, SMS automation settings, app lock, and language preferences." path="/profile" />
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

            <Button 
              variant="outline"
              className="w-full h-10 gap-2 border-dashed border-primary/40 hover:border-primary/80 transition-colors"
              onClick={async () => {
                const toastId = toast.loading('Reading simulated messages...');
                try {
                  // Guard: prevent duplicate imports
                  if (localStorage.getItem('demoSmsImported') === 'true') {
                    toast.info('Demo SMS messages have already been imported.', { id: toastId });
                    return;
                  }

                  // Ensure automation settings are enabled
                  setSmsEnabled(true);
                  const settingsArr = await db.settings.toArray();
                  if (settingsArr?.[0]?.id) {
                    await db.settings.update(settingsArr[0].id, { smsPermissionGranted: true });
                  }
                  
                  // Initialize SMS automation (registers listener only)
                  await initSMSAutomation();
                  
                  // Explicitly import mock SMS history
                  const { readSMSMessages } = await import('@/services/sms/androidSmsPlugin');
                  await readSMSMessages(100, 7);
                  
                  localStorage.setItem('demoSmsImported', 'true');
                  toast.success('Demo SMS messages imported successfully!', { id: toastId });
                  localStorage.setItem('lastSmsSyncTime', new Date().toISOString());
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to import demo SMS messages.', { id: toastId });
                }
              }}
            >
              <MessageSquare className="w-4 h-4 text-primary" />
              Import Demo SMS
            </Button>

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

        {/* Demo Health Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Demo Health Status</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm py-1 border-b border-muted/50">
              <span className="text-muted-foreground font-medium">Receipt System</span>
              <span className={`font-semibold ${healthStatus.receiptSystem.includes('✓') ? 'text-success' : 'text-destructive'}`}>
                {healthStatus.receiptSystem}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-muted/50">
              <span className="text-muted-foreground font-medium">SMS System</span>
              <span className={`font-semibold ${healthStatus.smsSystem.includes('✓') ? 'text-success' : 'text-destructive'}`}>
                {healthStatus.smsSystem}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-muted/50">
              <span className="text-muted-foreground font-medium">AI Categorization</span>
              <span className={`font-semibold ${healthStatus.aiCategorization.includes('✓') ? 'text-success' : 'text-destructive'}`}>
                {healthStatus.aiCategorization}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm py-1 border-b border-muted/50">
              <span className="text-muted-foreground font-medium">Ledger Storage</span>
              <span className={`font-semibold ${healthStatus.ledgerStorage.includes('✓') ? 'text-success' : 'text-destructive'}`}>
                {healthStatus.ledgerStorage}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-muted-foreground font-medium">Insights Engine</span>
              <span className={`font-semibold ${healthStatus.insightsEngine.includes('✓') ? 'text-success' : 'text-destructive'}`}>
                {healthStatus.insightsEngine}
              </span>
            </div>
          </div>
        </Card>

        {/* SMS Diagnostics & Test Dashboard */}
        {smsEnabled && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">SMS Diagnostics & Validation</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-accent/10">
                  <p className="text-xs text-muted-foreground">SMS Processed</p>
                  <p className="text-xl font-bold">{smsProcessedTotal}</p>
                </div>
                <div className="p-3 rounded-lg border bg-accent/10">
                  <p className="text-xs text-muted-foreground">SMS Saved</p>
                  <p className="text-xl font-bold text-success">{smsSaved}</p>
                </div>
                <div className="p-3 rounded-lg border bg-accent/10">
                  <p className="text-xs text-muted-foreground">SMS Discarded</p>
                  <p className="text-xl font-bold text-muted-foreground">{smsDiscarded}</p>
                </div>
                <div className="p-3 rounded-lg border bg-accent/10">
                  <p className="text-xs text-muted-foreground">Duplicate Blocked</p>
                  <p className="text-xl font-bold text-warning">{duplicateBlocked}</p>
                </div>
                <div className="p-3 rounded-lg border bg-accent/10 col-span-2">
                  <p className="text-xs text-muted-foreground">Needs Review Count</p>
                  <p className="text-xl font-bold text-destructive">{needsReviewCount}</p>
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">SMS Validation Report</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg border bg-muted/40">
                    <p className="text-xs text-muted-foreground">Parser Success</p>
                    <p className="text-sm font-semibold">{parserSuccessRate}%</p>
                  </div>
                  <div className="p-2 rounded-lg border bg-muted/40">
                    <p className="text-xs text-muted-foreground">Categorize Success</p>
                    <p className="text-sm font-semibold">{categorizationSuccessRate}%</p>
                  </div>
                  <div className="p-2 rounded-lg border bg-muted/40">
                    <p className="text-xs text-muted-foreground">Avg Confidence</p>
                    <p className="text-sm font-semibold">{avgConfidence}%</p>
                  </div>
                </div>
              </div>

              {topCategories.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Categories Detected</p>
                  <div className="space-y-1">
                    {topCategories.map(([cat, count]) => (
                      <div key={cat} className="flex justify-between items-center text-sm">
                        <span>{cat}</span>
                        <span className="font-semibold text-muted-foreground">{count} {count === 1 ? 'sms' : 'smses'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topMerchants.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Merchants</p>
                  <div className="space-y-1">
                    {topMerchants.map(([merch, count]) => (
                      <div key={merch} className="flex justify-between items-center text-sm">
                        <span className="truncate max-w-[200px]">{merch}</span>
                        <span className="font-semibold text-muted-foreground">{count} txn</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Hidden Developer Reset Controls */}
        {showDev && (
          <Card className="p-6 border-2 border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setDevExpanded(!devExpanded)}>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-destructive" />
                <h3 className="text-lg font-semibold text-destructive">Developer Sandbox</h3>
              </div>
              <span className="text-sm text-destructive font-medium">{devExpanded ? 'Collapse' : 'Expand'}</span>
            </div>
            {devExpanded && (
              <div className="mt-4 pt-4 border-t border-destructive/20 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Developer controls for demo testing. Resetting clears diagnostics counts, database SMS records, and retraining models.
                </p>
                <Button 
                  variant="destructive" 
                  className="w-full justify-center" 
                  onClick={handleResetDemoData}
                >
                  Reset Demo Data
                </Button>
              </div>
            )}
          </Card>
        )}

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
            <div 
              className="flex justify-between cursor-pointer select-none active:opacity-50"
              onClick={() => {
                if (showDev) {
                  setDevExpanded(prev => !prev);
                  return;
                }
                const nextCount = tapCount + 1;
                if (nextCount >= 5) {
                  setShowDev(true);
                  setDevExpanded(true);
                  toast.success('Developer Sandbox unlocked!');
                } else {
                  setTapCount(nextCount);
                  if (nextCount > 1) {
                    toast.info(`Tap ${5 - nextCount} more times to unlock developer controls.`);
                  }
                }
              }}
            >
              <span className="text-muted-foreground">{t('profile.version')}</span>
              <span className="font-medium">1.0.0 {showDev && '🛠️'}</span>
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
    </>
  );
}
