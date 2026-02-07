import { Home, Users, Wallet, User, Cpu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";

export function MobileBottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const { primaryColor } = useApartmentColor();

  const navigationItems = [
    { title: t.nav.home, url: "/dashboard", icon: Home },
    { title: "IoT", url: "/devices", icon: Cpu },
    { title: t.nav.community, url: "/community", icon: Users },
    { title: t.nav.wallet.split(' ')[0], url: "/wallet", icon: Wallet },
    { title: t.nav.profile, url: "/profile", icon: User },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t border-border/50" />
      
      {/* Safe area padding for iOS - optimized for different screen sizes */}
      <div className="relative flex items-center justify-around px-1 xs:px-2 py-1.5 xs:py-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] xs:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.url;
          const Icon = item.icon;

          return (
            <Link
              key={item.title}
              to={item.url}
              replace={false}
              className="relative flex flex-col items-center justify-center flex-1 py-1 xs:py-2 group touch-manipulation min-w-0"
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-0.5 xs:-top-1 w-8 xs:w-10 sm:w-12 h-0.5 xs:h-1 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon container - responsive sizes */}
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex items-center justify-center w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-xl xs:rounded-2xl transition-all duration-300",
                  isActive 
                    ? "shadow-lg" 
                    : "group-active:bg-muted/50"
                )}
                style={isActive ? {
                  backgroundColor: `${primaryColor}26`,
                  boxShadow: `0 10px 15px -3px ${primaryColor}33`,
                } : undefined}
              >
                <Icon
                  className="w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6 transition-all duration-300 text-muted-foreground group-hover:text-foreground"
                  style={isActive ? { 
                    color: primaryColor,
                    transform: 'scale(1.1)',
                  } : undefined}
                />
              </motion.div>

              {/* Label - responsive text */}
              <span
                className="text-[9px] xs:text-[10px] sm:text-xs mt-0.5 xs:mt-1 font-medium transition-colors duration-300 truncate max-w-full px-0.5 text-muted-foreground"
                style={isActive ? { color: primaryColor } : undefined}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
