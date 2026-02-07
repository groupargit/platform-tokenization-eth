import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { syncUserToFirebase, updateUserActiveStatus, getUserIdFromEmail } from "@/hooks/useFirebase";
import { useFirebaseUserCached, useFirebaseApartmentsCached, clearUserDataOnLogout } from "@/hooks/useFirebaseWithCache";
import { clearWalletSessionStorage } from "@/hooks/walletSessionStorage";
import { useQueryClient } from "@tanstack/react-query";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const hasSyncedRef = useRef(false);
  const activeStatusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);
  
  const userId = getUserIdFromEmail(user?.email);
  const { user: firebaseUser } = useFirebaseUserCached(userId);
  const { apartments } = useFirebaseApartmentsCached();

  useEffect(() => {
    if (isAuthenticated && user && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncUserToFirebase(user).catch((error) => {
        console.error('Error syncing user:', error);
      });
    } else if (!isAuthenticated) {
      hasSyncedRef.current = false;
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated && userId && isUnmountingRef.current) {
      updateUserActiveStatus('B001', userId, '', '', false);
      if (activeStatusIntervalRef.current) {
        clearInterval(activeStatusIntervalRef.current);
        activeStatusIntervalRef.current = null;
      }
      return;
    }

    if (isAuthenticated && userId) {
      isUnmountingRef.current = false;
      const userApartmentId = firebaseUser?.primaryApartment || (firebaseUser?.apartments ? Object.keys(firebaseUser.apartments)[0] : null);
      const userApartment = userApartmentId ? apartments.find(apt => apt.apartmentId === userApartmentId) : null;
      const userApartmentName = userApartment?.name || userApartmentId || 'Sin apartamento';

      updateUserActiveStatus('B001', userId, userApartmentId || 'none', userApartmentName, true);

      if (activeStatusIntervalRef.current) {
        clearInterval(activeStatusIntervalRef.current);
      }

      activeStatusIntervalRef.current = setInterval(() => {
        const currentApartmentId = firebaseUser?.primaryApartment || (firebaseUser?.apartments ? Object.keys(firebaseUser.apartments)[0] : null);
        const currentApartment = currentApartmentId ? apartments.find(apt => apt.apartmentId === currentApartmentId) : null;
        const currentApartmentName = currentApartment?.name || currentApartmentId || 'Sin apartamento';
        updateUserActiveStatus('B001', userId, currentApartmentId || 'none', currentApartmentName, true);
      }, 2 * 60 * 1000);
      
      return () => {
        if (activeStatusIntervalRef.current) {
          clearInterval(activeStatusIntervalRef.current);
          activeStatusIntervalRef.current = null;
        } 
      };
    }
  }, [isAuthenticated, userId, firebaseUser, apartments, authLoading]);

  const handleLogout = () => {
    isUnmountingRef.current = true;
    if (userId) {
      updateUserActiveStatus('B001', userId, '', '', false);
    }
    if (activeStatusIntervalRef.current) {
      clearInterval(activeStatusIntervalRef.current);
      activeStatusIntervalRef.current = null;
    }
    clearWalletSessionStorage();
    clearUserDataOnLogout(queryClient);
    logout();
    toast({
      title: "Sesión cerrada",
      description: "Cerraste sesión exitosamente",
    });
  };

  return (
    <SidebarProvider defaultOpen={isAuthenticated && !isMobile}>
      <div className="min-h-screen flex w-full bg-background">
        {isAuthenticated && !isMobile && <AppSidebar isAuthenticated={isAuthenticated} />}

        <div className={`flex-1 flex flex-col min-h-screen ${!isAuthenticated ? 'ml-0' : ''}`}>
          <TopNav
            userName={user?.name || user?.email || "Invitado"}
            userEmail={user?.email}
            onLogout={handleLogout}
            isAuthenticated={isAuthenticated}
            hasSidebar={isAuthenticated && !isMobile}
          />

          <main className={`flex-1 overflow-auto pt-14 xs:pt-16 ${isAuthenticated && isMobile ? 'pb-20 xs:pb-24' : ''}`}>
            <div className="container mx-auto max-w-7xl px-3 xs:px-4 sm:px-5 md:px-6 lg:px-8 py-3 xs:py-4 md:py-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            </div>
          </main>

          {isAuthenticated && <MobileBottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
}
