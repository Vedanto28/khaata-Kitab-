import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Bot, DollarSign, FileText, Sparkles, TrendingUp, Wallet, Receipt, BarChart3, Plus, CreditCard, ArrowUpRight, BookOpen, UserCircle } from 'lucide-react';
import { db, initializeSettings } from '@/lib/db';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const handleComplete = async () => {
    await initializeSettings();
    const settings = await db.settings.toArray();
    if (settings[0]?.id) {
      await db.settings.update(settings[0].id, { onboardingCompleted: true });
    }
    localStorage.setItem('onboardingCompleted', 'true');
    navigate('/login');
  };

  const handleSkip = () => {
    handleComplete();
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setStep((prev) => prev + newDirection);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      <div className="max-w-md w-full">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="welcome"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-center space-y-6"
            >
              {/* Robot Illustration */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative h-64 flex items-center justify-center"
              >
                {/* Floating coins and icons */}
                <motion.div
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="absolute top-8 left-12"
                >
                  <DollarSign className="w-8 h-8 text-accent" />
                </motion.div>
                <motion.div
                  animate={{ y: [10, -10, 10] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute top-12 right-16"
                >
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                    ₹
                  </div>
                </motion.div>
                <motion.div
                  animate={{ y: [-5, 15, -5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 1 }}
                  className="absolute bottom-16 left-16"
                >
                  <FileText className="w-6 h-6 text-primary" />
                </motion.div>
                <motion.div
                  animate={{ y: [15, -5, 15] }}
                  transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.3 }}
                  className="absolute bottom-12 right-12"
                >
                  <ArrowUpRight className="w-7 h-7 text-success" />
                </motion.div>
                <motion.div
                  animate={{ y: [-8, 8, -8] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', delay: 0.7 }}
                  className="absolute top-20 right-8"
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                </motion.div>

                {/* Robot */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                    <Bot className="w-16 h-16 text-primary-foreground" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-success flex items-center justify-center shadow-md"
                  >
                    <span className="text-2xl">😊</span>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="space-y-3"
              >
                <h1 className="text-3xl font-bold text-foreground">Welcome to KhaataKitab</h1>
                <p className="text-lg text-accent font-medium">आपका हिसाब, हमारा भरोसा</p>
                <p className="text-muted-foreground">Your AI-powered bookkeeping partner for small vendors.</p>
              </motion.div>

              <ProgressDots current={0} total={6} />
              <NavigationButtons onSkip={handleSkip} onContinue={() => paginate(1)} showPrevious={false} />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="dashboard"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-4"
              >
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <TrendingUp className="w-10 h-10 text-primary" />
                </div>

                <h2 className="text-2xl font-bold text-foreground">Smarter Dashboard.<br />Sharper Insights.</h2>
                <p className="text-muted-foreground">Track income, expenses, and cash flow instantly with your AI-driven dashboard.</p>

                {/* Income Card with Chart */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="bg-card border border-border rounded-xl p-6 shadow-md"
                >
                  <div className="text-left space-y-3">
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold text-foreground">Income</h3>
                      <span className="text-3xl font-bold text-success">₹25,600</span>
                    </div>
                    {/* Simple chart visualization */}
                    <div className="flex items-end gap-1 h-20 mt-4">
                      {[30, 45, 25, 60, 40, 70, 55].map((height, i) => (
                        <motion.div
                          key={i}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
                          className="flex-1 bg-gradient-to-t from-primary to-primary/60 rounded-t"
                          style={{ height: `${height}%`, transformOrigin: 'bottom' }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <ProgressDots current={1} total={6} />
              <NavigationButtons onPrevious={() => paginate(-1)} onContinue={() => paginate(1)} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="handsfree"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-4"
              >
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                  <Receipt className="w-10 h-10 text-accent" />
                </div>

                <h2 className="text-2xl font-bold text-foreground">Hands-Free<br />Bookkeeping</h2>
                <p className="text-muted-foreground">Reads your payment SMS and scans receipts automatically.</p>

                {/* Category Cards */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="bg-card/70 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-lg space-y-3"
                >
                  {[
                    { label: 'Income', icon: Plus, color: 'success' },
                    { label: 'Expense', icon: Wallet, color: 'destructive' },
                    { label: 'Payment', icon: CreditCard, color: 'primary' },
                  ].map((category, i) => (
                    <motion.div
                      key={category.label}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.15, duration: 0.4 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border border-border bg-${category.color}/10`}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-${category.color}/20 flex items-center justify-center`}>
                        <category.icon className={`w-5 h-5 text-${category.color}`} />
                      </div>
                      <span className={`font-medium text-${category.color}`}>{category.label}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              <ProgressDots current={2} total={6} />
              <NavigationButtons onPrevious={() => paginate(-1)} onContinue={() => paginate(1)} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="insights"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-4"
              >
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-success" />
                </div>

                <h2 className="text-2xl font-bold text-foreground">Understand Your Finances -<br />Intelligently</h2>
                <p className="text-muted-foreground">Get monthly AI-generated reports with interactive charts, an explainable credit signal, and personalized suggestions.</p>

                {/* Credit Score Visualization */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="bg-card border border-border rounded-2xl p-6 shadow-md"
                >
                  <div className="flex items-center justify-center gap-6">
                    {/* Circular gauge */}
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                        <motion.circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="url(#gradient)"
                          strokeWidth="10"
                          strokeDasharray={`${2 * Math.PI * 50}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - 0.76) }}
                          transition={{ delay: 0.6, duration: 1, ease: 'easeOut' }}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(var(--accent))" />
                            <stop offset="100%" stopColor="hsl(var(--success))" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">760</span>
                        <span className="text-xs text-muted-foreground">CREDIT SIGNAL</span>
                      </div>
                    </div>

                    {/* Bar chart */}
                    <div className="flex items-end gap-2 h-24">
                      {[60, 75, 90].map((height, i) => (
                        <motion.div
                          key={i}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
                          className={`w-8 rounded-t-lg ${
                            i === 0 ? 'bg-accent' : i === 1 ? 'bg-accent/70' : 'bg-primary'
                          }`}
                          style={{ height: `${height}%`, transformOrigin: 'bottom' }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              <ProgressDots current={3} total={6} />
              <NavigationButtons onPrevious={() => paginate(-1)} onContinue={() => paginate(1)} />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="ready"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-4"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
                >
                  <Sparkles className="w-10 h-10 text-primary" />
                </motion.div>

                <h2 className="text-3xl font-bold text-foreground">You're Ready to<br />Simplify Your Finances</h2>
                <p className="text-muted-foreground leading-relaxed">Let KhaataKitab handle your numbers — so you can focus on your business.</p>
              </motion.div>

              <ProgressDots current={4} total={6} />
              <NavigationButtons onPrevious={() => paginate(-1)} onContinue={() => paginate(1)} />
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="account"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-4"
              >
                {/* Profile Icon with floating elements */}
                <div className="relative h-48 flex items-center justify-center">
                  <motion.div
                    animate={{ y: [-8, 8, -8] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="absolute top-8 left-16"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-lg">₹</span>
                    </div>
                  </motion.div>
                  <motion.div
                    animate={{ y: [8, -8, 8] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
                    className="absolute top-12 right-20"
                  >
                    <BookOpen className="w-6 h-6 text-primary/60" />
                  </motion.div>
                  <motion.div
                    animate={{ y: [-5, 10, -5] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.3 }}
                    className="absolute bottom-16 left-20"
                  >
                    <Receipt className="w-5 h-5 text-accent/60" />
                  </motion.div>

                  {/* Main profile icon */}
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                    className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-accent to-primary/70 flex items-center justify-center shadow-lg"
                  >
                    <UserCircle className="w-20 h-20 text-primary-foreground" />
                  </motion.div>
                </div>

                <h2 className="text-3xl font-bold text-foreground">Create Your Account</h2>
                <p className="text-muted-foreground leading-relaxed px-4">
                  Sign in or create an account to continue using KhaataKitab.
                </p>
              </motion.div>

              <ProgressDots current={5} total={6} />

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="space-y-3 pt-4"
              >
                <Button
                  onClick={() => {
                    handleComplete();
                    navigate('/signup');
                  }}
                  className="w-full bg-primary text-primary-foreground rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-300"
                  size="lg"
                >
                  Create Account
                </Button>
                <Button
                  onClick={() => {
                    handleComplete();
                    navigate('/login');
                  }}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Sign In
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Progress Dots Component
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex justify-center gap-2 py-4">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            width: i === current ? 32 : 8,
            backgroundColor: i === current ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
          }}
          transition={{ duration: 0.3 }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  );
}

// Navigation Buttons Component
function NavigationButtons({
  onPrevious,
  onContinue,
  onSkip,
  showPrevious = true,
}: {
  onPrevious?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  showPrevious?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      {showPrevious && onPrevious && (
        <Button variant="outline" onClick={onPrevious} className="flex-1" size="lg">
          Previous
        </Button>
      )}
      {onSkip && !showPrevious && (
        <Button variant="outline" onClick={onSkip} className="flex-1" size="lg">
          Skip
        </Button>
      )}
      {onContinue && (
        <Button onClick={onContinue} className="flex-1" size="lg">
          Continue
        </Button>
      )}
    </div>
  );
}
