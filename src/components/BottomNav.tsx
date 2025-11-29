import { Link, useLocation } from 'react-router-dom';
import { BookOpen, TrendingUp, User, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: '/ledger', icon: BookOpen, label: t('nav.ledger') },
    { path: '/inventory', icon: Package, label: t('nav.inventory') },
    { path: '/insights', icon: TrendingUp, label: t('nav.insights') },
    { path: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-primary' : ''}`} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
