import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { ApartmentGrid } from "@/components/apartments/ApartmentGrid";
import { ApartmentDetailFirebase } from "@/components/apartments/ApartmentDetailFirebase";
import { ResidentDashboard } from "@/components/dashboard/ResidentDashboard";
import { useFirebaseApartments, useFirebaseBuilding, FirebaseApartment, useFirebaseUser, getUserIdFromEmail } from "@/hooks/useFirebase";
import { useFirebaseUserSync } from "@/hooks/useFirebaseUserSync";
import { Sparkles, Loader2, Building2, Wifi, Trophy, AlertCircle, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth0 } from "@auth0/auth0-react";
import { useQueryClient } from "@tanstack/react-query";
import { clearWalletSessionStorage } from "@/hooks/walletSessionStorage";
import { clearUserDataOnLogout } from "@/hooks/useFirebaseWithCache";
import { useLanguage } from "@/i18n";
import grouparLogo from "@/assets/groupar-logo.png";
import grouparText from "@/assets/groupar-text.png";

export default function Dashboard() {
  const { t } = useLanguage();
  const { apartments, loading, error, isConfigured: isFirebaseConfigured } = useFirebaseApartments();
  const { building } = useFirebaseBuilding('B001');
  const [selectedApartment, setSelectedApartment] = useState<FirebaseApartment | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, logout, isAuthenticated } = useAuth0();
  
  const { firebaseUser: syncedFirebaseUser, isNewUser, loading: userSyncLoading } = useFirebaseUserSync(user, isAuthenticated);
  
  const userId = getUserIdFromEmail(user?.email);
  const { user: firebaseUser, loading: userLoading } = useFirebaseUser(userId);
  
  const currentFirebaseUser = firebaseUser || (!userLoading && syncedFirebaseUser ? syncedFirebaseUser : null);
  const shouldWaitForUserData = isAuthenticated && userLoading;
  

  useEffect(() => {
    if (isNewUser && firebaseUser) {
      toast({
        title: t.auth.welcomeTitle,
        description: t.auth.welcomeDesc,
      });
    }
  }, [isNewUser, firebaseUser, toast, t.auth.welcomeTitle, t.auth.welcomeDesc]);

  const handleLogout = () => {
    clearWalletSessionStorage();
    clearUserDataOnLogout(queryClient);
    logout({ logoutParams: { returnTo: window.location.origin } });
    toast({
      title: t.auth.logoutSuccessTitle,
      description: t.auth.logoutSuccessDesc,
    });
  };

  const userHasApartments = useMemo(() => {
    if (isAuthenticated && (userLoading || userSyncLoading)) {
      return false;
    }
    
    if (!isAuthenticated || !currentFirebaseUser) {
      return false;
    }
    const hasApartments = currentFirebaseUser.apartments && Object.keys(currentFirebaseUser.apartments).length > 0;
    const hasPrimaryApartment = !!currentFirebaseUser.primaryApartment;
    return hasApartments || hasPrimaryApartment;
  }, [currentFirebaseUser, isAuthenticated, userLoading, userSyncLoading]);

  const userApartments = useMemo(() => {
    if (!apartments.length || !isAuthenticated || !currentFirebaseUser) {
      return [];
    }
    
    let userApartmentIds: string[] = [];
    
    if (currentFirebaseUser.apartments && Object.keys(currentFirebaseUser.apartments).length > 0) {
      userApartmentIds = Object.keys(currentFirebaseUser.apartments);
    } else if (currentFirebaseUser.primaryApartment) {
      userApartmentIds = [currentFirebaseUser.primaryApartment];
    }

    if (userApartmentIds.length === 0) return [];

    const normalizeId = (id: string): string => {
      if (!id) return '';
      return id.replace(/^(apt_|local_)/, '').toLowerCase();
    };

    const matched = apartments.filter(apt => {
      if (!apt.apartmentId) return false;
      
      if (userApartmentIds.includes(apt.apartmentId)) {
        return true;
      }
      
      const normalizedAptId = normalizeId(apt.apartmentId);
      const normalizedUserIds = userApartmentIds.map(normalizeId);
      
      if (normalizedUserIds.some(normalizedUserId => normalizedAptId === normalizedUserId)) {
        return true;
      }
      
      if (apt.apartmentNumber) {
        const normalizedAptNumber = normalizeId(String(apt.apartmentNumber));
        return normalizedUserIds.some(normalizedUserId => 
          normalizedAptNumber === normalizedUserId
        );
      }
      
      return false;
    });

    return matched;
  }, [currentFirebaseUser, apartments, isAuthenticated]);

  const availableApartments = useMemo(() => {
    return apartments.filter(apt => apt.available);
  }, [apartments]);

  const displayedApartments = useMemo(() => {
    if (!apartments.length) return [];
    
    if (isAuthenticated) {
      if (shouldWaitForUserData) {
        return [];
      }
      
      if (!firebaseUser && !syncedFirebaseUser) {
        return [];
      }
      
      if (syncedFirebaseUser && !firebaseUser && userLoading) {
        return [];
      }
    }
    
    if (isAuthenticated && userHasApartments) {
      if (userApartments.length > 0) {
        return userApartments;
      }
      return [];
    }
    
    return availableApartments;
  }, [apartments, isAuthenticated, userHasApartments, userApartments, availableApartments, currentFirebaseUser, userLoading, userSyncLoading, firebaseUser, syncedFirebaseUser]);

  const formattedApartments = displayedApartments.map(apt => ({
    id: apt.apartmentId,
    name: apt.name,
    concept: apt.concept,
    colorCode: apt.colorCode,
    price: apt.price,
    type: apt.type,
    available: apt.available,
    description: apt.description,
    features: apt.features,
    images: apt.images,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userName={user?.name || user?.email || "Invitado"}
        userEmail={user?.email}
        onLogout={handleLogout}
        isAuthenticated={isAuthenticated}
      />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-casa-indigo" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-casa-celeste" />
      </div>

      <main className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <AnimatePresence mode="wait">
            {(loading || (isAuthenticated && shouldWaitForUserData)) ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Cargando tu espacio...</p>
              </motion.div>
            ) : selectedApartment ? (
              <ApartmentDetailFirebase
                key="detail"
                apartment={selectedApartment}
                onBack={() => setSelectedApartment(null)}
              />
            ) : isAuthenticated && userHasApartments && currentFirebaseUser ? (
              <ResidentDashboard
                key="resident"
                firebaseUser={currentFirebaseUser}
                apartments={apartments}
                userApartments={userApartments}
                building={building}
                onRefresh={() => {
                  window.location.reload();
                }}
                onApartmentClick={(apt) => setSelectedApartment(apt)}
              />
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center mb-12"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary font-medium">
                      Smart Living Experience
                    </span>
                  </div>
                  
                  <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                    <span className="gradient-text">Descubre tu</span>
                    <br />
                    <span className="text-foreground">espacio ideal</span>
                  </h1>
                  
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {building?.buildingName || 'Casa Color'} - {building?.address || 'Cargando ubicación...'}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
                >
                  <div className="glass-panel p-4 text-center hover:border-primary/30 transition-colors">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="font-display text-2xl font-bold">
                      {apartments.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Apartamentos</div>
                  </div>
                  <div className="glass-panel p-4 text-center hover:border-primary/30 transition-colors">
                    <Wifi className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--serenity))]" />
                    <div className="font-display text-2xl font-bold">
                      {apartments.filter(a => a.available).length}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.home.available}</div>
                  </div>
                  <div className="glass-panel p-4 text-center hover:border-primary/30 transition-colors">
                    <Trophy className="w-6 h-6 mx-auto mb-2 text-accent" />
                    <div className="font-display text-2xl font-bold">
                      {building?.totalPoints?.toLocaleString() || '---'}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.home.totalPoints}</div>
                  </div>
                  <div className="glass-panel p-4 text-center hover:border-primary/30 transition-colors">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-[hsl(var(--nature))]" />
                    <div className="font-display text-2xl font-bold">
                      {building?.totalBadges?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{t.home.badges}</div>
                  </div>
                </motion.div>

                {!isFirebaseConfigured && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-panel p-6 mb-8 border-yellow-500/30 bg-yellow-500/5"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                          {t.errors.configError}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {t.errors.configErrorDesc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentFirebaseUser && currentFirebaseUser.role === 'pending' && !currentFirebaseUser.primaryApartment && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-panel p-6 mb-8 border-primary/30 bg-primary/5"
                  >
                    <div className="flex items-start gap-3">
                      <UserPlus className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary mb-2">
                          {t.auth.pendingSpaceTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t.auth.pendingSpaceDesc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && isFirebaseConfigured && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-panel p-6 mb-8 border-destructive/30"
                  >
                    <div className="flex items-center gap-3 text-destructive">
                      <AlertCircle className="w-5 h-5" />
                      <p>{t.errors.connectionError}</p>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex items-center gap-3 mb-8"
                >
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  <h2 className="font-display text-xl font-semibold text-muted-foreground">
                    {t.home.availableSpaces}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-border via-transparent to-transparent" />
                </motion.div>

                {formattedApartments.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-8 text-center"
                  >
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">
                      No hay espacios disponibles en este momento.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Consulta pronto para nuevas opciones.
                    </p>
                  </motion.div>
                ) : (
                  <ApartmentGrid
                    apartments={formattedApartments}
                    onApartmentClick={(apt) => {
                      const firebaseApt = apartments.find(a => a.apartmentId === apt.id);
                      if (firebaseApt) setSelectedApartment(firebaseApt);
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="relative border-t border-border/50 py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={grouparLogo} alt="Groupar" className="w-8 h-8 object-contain" />
              <img src={grouparText} alt="Groupar" className="h-4 object-contain" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2025 Casa Color - Un producto de Groupar S.A.S. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
