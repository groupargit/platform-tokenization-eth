import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ApartmentGrid } from "@/components/apartments/ApartmentGrid";
import { ApartmentDetailFirebase } from "@/components/apartments/ApartmentDetailFirebase";
import { QuickAccessSummary } from "@/components/devices/QuickAccessSummary";
import { WaitlistForm, WaitlistStatus } from "@/components/waitlist";
import { useFirebaseApartmentsCached, useFirebaseBuildingCached, useFirebaseUserCached } from "@/hooks/useFirebaseWithCache";
import { useFirebaseUserSync } from "@/hooks/useFirebaseUserSync";
import { useAuth } from "@/hooks/useAuth";
import { FirebaseApartment, getUserIdFromEmail } from "@/hooks/useFirebase";
import { Sparkles, Loader2, Building2, Wifi, Trophy, AlertCircle, RefreshCw, Sun, Moon, Sunrise, FileText, CheckCircle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n";

function useGreeting() {
  const { t } = useLanguage();
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return { text: t.greetings.morning, icon: <Sunrise className="w-5 h-5 text-accent" /> };
  } else if (hour >= 12 && hour < 19) {
    return { text: t.greetings.afternoon, icon: <Sun className="w-5 h-5 text-accent" /> };
  } else {
    return { text: t.greetings.evening, icon: <Moon className="w-5 h-5 text-primary" /> };
  }
}

export default function Home() {
  const { user: authUser, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const userId = getUserIdFromEmail(authUser?.email);
  
  const memoizedAuthUser = useMemo(() => {
    return authUser ? { email: authUser.email, name: authUser.name } : undefined;
  }, [authUser?.email, authUser?.name]);
  
  const { firebaseUser: syncedFirebaseUser, loading: userSyncLoading } = useFirebaseUserSync(
    memoizedAuthUser,
    isAuthenticated
  );
  
  const { user: firebaseUser, loading: userLoading } = useFirebaseUserCached(userId);
  
  const currentFirebaseUser = firebaseUser || syncedFirebaseUser || null;
  const { apartments, loading: apartmentsLoading, error, isConfigured: isFirebaseConfigured } = useFirebaseApartmentsCached();
  const { building } = useFirebaseBuildingCached('B001');
  const [selectedApartment, setSelectedApartment] = useState<FirebaseApartment | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [studyRequestDialogOpen, setStudyRequestDialogOpen] = useState(false);
  const [selectedApartmentForStudy, setSelectedApartmentForStudy] = useState<FirebaseApartment | null>(null);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [studyRequestData, setStudyRequestData] = useState({
    name: authUser?.name || '',
    email: authUser?.email || '',
    phone: firebaseUser?.phone || '',
    message: '',
  });
  const { toast } = useToast();
  
  const hasWaitlistApplication = useMemo(() => {
    return firebaseUser?.waitlistApplication?.revisionId != null;
  }, [firebaseUser]);

  const greeting = useGreeting();
  const loading = apartmentsLoading || (isAuthenticated && userLoading);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const userHasApartments = useMemo(() => {
    if (isAuthenticated && (userLoading || userSyncLoading)) {
      return false;
    }
    
    if (!isAuthenticated || !currentFirebaseUser) return false;
    
    const hasApartments = currentFirebaseUser.apartments && Object.keys(currentFirebaseUser.apartments).length > 0;
    const hasPrimaryApartment = !!currentFirebaseUser.primaryApartment;
    
    return hasApartments || hasPrimaryApartment;
  }, [currentFirebaseUser, isAuthenticated, userLoading, userSyncLoading]);

  const userApartments = useMemo(() => {
    if (!apartments.length || !isAuthenticated || !currentFirebaseUser) return [];
    
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

    const matchedApartments = apartments.filter(apt => {
      if (!apt.apartmentId) return false;
      
      if (userApartmentIds.includes(apt.apartmentId)) {
        return true;
      }
      
      const normalizedAptId = normalizeId(apt.apartmentId);
      const normalizedUserIds = userApartmentIds.map(normalizeId);
      
      const hasMatch = normalizedUserIds.some(normalizedUserId => 
        normalizedAptId === normalizedUserId
      );
      
      if (hasMatch) return true;
      
      if (apt.apartmentNumber) {
        const normalizedAptNumber = normalizeId(String(apt.apartmentNumber));
        return normalizedUserIds.some(normalizedUserId => 
          normalizedAptNumber === normalizedUserId
        );
      }
      
      return false;
    });


    return matchedApartments;
  }, [currentFirebaseUser, apartments, isAuthenticated]);

  const availableApartments = useMemo(() => {
    return apartments.filter(apt => apt.available);
  }, [apartments]);

  const displayedApartments = useMemo(() => {
    if (!apartments.length) return [];
    
    if (isAuthenticated) {
      const hasUserData = syncedFirebaseUser || firebaseUser;
      
      if (hasUserData) {
      } else if (userLoading || (userSyncLoading && !syncedFirebaseUser)) {
        return [];
      } else {
      }
    }
    
    
    if (isAuthenticated && userHasApartments) {
      if (userApartments.length > 0) {
        return userApartments;
      }
      return [];
    }
    
    if (isAuthenticated && !userHasApartments) {
      return availableApartments;
    }
    
    return availableApartments;
  }, [apartments, isAuthenticated, userHasApartments, userApartments, availableApartments, currentFirebaseUser, userLoading, userSyncLoading, firebaseUser, syncedFirebaseUser, userId]);

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

  const handleRequestStudy = (apartment: FirebaseApartment) => {
    setSelectedApartmentForStudy(apartment);
    setStudyRequestData({
      name: authUser?.name || '',
      email: authUser?.email || '',
      phone: firebaseUser?.phone || '',
      message: `Me interesa solicitar un estudio para el espacio: ${apartment.name}`,
    });
    setStudyRequestDialogOpen(true);
  };

  const handleSubmitStudyRequest = async () => {
    if (!selectedApartmentForStudy) return;

    toast({
      title: "Solicitud enviada",
                      description: `Hemos recibido tu solicitud para ${selectedApartmentForStudy.name}. Te contactaremos pronto.`,
    });
    
    setStudyRequestDialogOpen(false);
    setSelectedApartmentForStudy(null);
    setStudyRequestData({
      name: authUser?.name || '',
      email: authUser?.email || '',
      phone: firebaseUser?.phone || '',
      message: '',
    });
  };

  return (
    <DashboardLayout>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-casa-indigo" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-casa-celeste" />
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {selectedApartment ? (
            <ApartmentDetailFirebase
              key="detail"
              apartment={selectedApartment}
              onBack={() => setSelectedApartment(null)}
              showStudyRequestButton={isAuthenticated && !userHasApartments}
              onRequestStudy={() => {
                handleRequestStudy(selectedApartment);
              }}
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
                className="mb-4 xs:mb-6 md:mb-8"
              >
                <div className="flex items-center justify-between gap-2 xs:gap-3">
                  <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                    <div className="shrink-0">
                      {greeting.icon}
                    </div>
                    <h1 className="font-display text-lg xs:text-xl md:text-2xl lg:text-3xl font-bold truncate">
                      {greeting.text}
                    </h1>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-1.5 xs:gap-2 h-8 xs:h-9 px-2 xs:px-3 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 xs:w-4 xs:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden xs:inline text-xs xs:text-sm">{t.home.refresh}</span>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3 md:gap-4 mb-4 xs:mb-6 md:mb-8"
              >
                <div className="glass-panel p-2.5 xs:p-3 md:p-4 text-center hover:border-primary/30 transition-colors">
                  <Building2 className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 mx-auto mb-1 xs:mb-2 text-primary" />
                  <div className="font-display text-lg xs:text-xl md:text-2xl font-bold">
                    {loading ? <Loader2 className="w-4 h-4 xs:w-5 xs:h-5 animate-spin mx-auto" /> : displayedApartments.length}
                  </div>
                  <div className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground truncate">{t.home.spaces}</div>
                </div>
                <div className="glass-panel p-2.5 xs:p-3 md:p-4 text-center hover:border-primary/30 transition-colors">
                  <Wifi className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 mx-auto mb-1 xs:mb-2 text-serenity" />
                  <div className="font-display text-lg xs:text-xl md:text-2xl font-bold">
                    {displayedApartments.filter(a => a.available).length}
                  </div>
                  <div className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground truncate">{t.home.available}</div>
                </div>
                {isAuthenticated ? (
                  <>
                    <div className="glass-panel p-2.5 xs:p-3 md:p-4 text-center hover:border-primary/30 transition-colors">
                      <Trophy className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 mx-auto mb-1 xs:mb-2 text-accent" />
                      <div className="font-display text-lg xs:text-xl md:text-2xl font-bold">
                        {firebaseUser?.gamification?.points?.toLocaleString() || '---'}
                      </div>
                      <div className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground truncate">{t.home.myPoints}</div>
                    </div>
                    <div className="glass-panel p-2.5 xs:p-3 md:p-4 text-center hover:border-primary/30 transition-colors">
                      <Sparkles className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 mx-auto mb-1 xs:mb-2 text-warmth" />
                      <div className="font-display text-lg xs:text-xl md:text-2xl font-bold">
                        {firebaseUser?.gamification?.level || 0}
                      </div>
                      <div className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground truncate">{t.home.myLevel}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="glass-panel p-2.5 xs:p-3 md:p-4 text-center hover:border-primary/30 transition-colors">
                      <Trophy className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 mx-auto mb-1 xs:mb-2 text-accent" />
                      <div className="font-display text-lg xs:text-xl md:text-2xl font-bold">
                        {building?.totalPoints?.toLocaleString() || '---'}
                      </div>
                      <div className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground truncate">{t.home.points}</div>
                    </div>
                    <div className="glass-panel p-2.5 xs:p-3 md:p-4 text-center hover:border-primary/30 transition-colors">
                      <Sparkles className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 mx-auto mb-1 xs:mb-2 text-warmth" />
                      <div className="font-display text-lg xs:text-xl md:text-2xl font-bold">
                        {building?.totalBadges?.length || 0}
                      </div>
                      <div className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground truncate">{t.home.badges}</div>
                    </div>
                  </>
                )}
              </motion.div>

              {!isFirebaseConfigured && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel p-3 xs:p-4 mb-4 xs:mb-6 border-yellow-500/30 bg-yellow-500/5"
                >
                  <div className="flex items-start gap-2 xs:gap-3">
                    <AlertCircle className="w-4 h-4 xs:w-5 xs:h-5 text-yellow-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-0.5 xs:mb-1 text-sm xs:text-base">
                        {t.home.configPending}
                      </h3>
                      <p className="text-[10px] xs:text-xs text-muted-foreground">
                        {t.home.someFeatureDisabled}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && isFirebaseConfigured && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel p-4 mb-6 border-destructive/30"
                >
                  <div className="flex items-center gap-3 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{t.home.connectionError}</p>
                  </div>
                </motion.div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-12 xs:py-16 md:py-20">
                  <Loader2 className="w-8 h-8 xs:w-10 xs:h-10 md:w-12 md:h-12 animate-spin text-primary mb-3 xs:mb-4" />
                  <p className="text-muted-foreground text-sm xs:text-base">{t.common.loading}</p>
                </div>
              )}

              {!loading && (
                <>
                  {isAuthenticated && userHasApartments && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.15 }}
                      className="mb-4 xs:mb-6 md:mb-8"
                    >
                      <QuickAccessSummary buildingId="B001" />
                    </motion.div>
                  )}

                  {isAuthenticated && !userHasApartments && (
                    <>
                      {hasWaitlistApplication && firebaseUser?.waitlistApplication && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                          className="mb-8"
                        >
                          <WaitlistStatus 
                            application={firebaseUser.waitlistApplication}
                            onUploadDocuments={() => {
                              toast({
                                title: "Próximamente",
                                description: "La funcionalidad de carga de documentos estará disponible pronto.",
                              });
                            }}
                          />
                        </motion.div>
                      )}
                      
                      {!hasWaitlistApplication && (
                        <>
                          {showWaitlistForm ? (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, delay: 0.2 }}
                              className="mb-8"
                            >
                              <WaitlistForm
                                userId={userId || ''}
                                userEmail={authUser?.email || ''}
                                userName={authUser?.name || ''}
                                onSuccess={() => {
                                  setShowWaitlistForm(false);
                                  handleRefresh();
                                }}
                              />
                            </motion.div>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, delay: 0.2 }}
                              className="glass-panel p-3 xs:p-4 md:p-6 mb-4 xs:mb-6 md:mb-8 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5"
                            >
                              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 xs:gap-4">
                                <div className="p-2 xs:p-3 rounded-full bg-primary/20 shrink-0">
                                  <ClipboardList className="w-5 h-5 xs:w-6 xs:h-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm xs:text-base md:text-lg mb-0.5 xs:mb-1">
                                    ¿Listo para tu nuevo hogar?
                                  </h3>
                                  <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground line-clamp-2">
                                    Únete a nuestra lista de espera. Proceso rápido y seguro.
                                  </p>
                                </div>
                                <Button 
                                  onClick={() => setShowWaitlistForm(true)}
                                  className="gap-1.5 xs:gap-2 whitespace-nowrap w-full xs:w-auto h-8 xs:h-9 md:h-10 text-xs xs:text-sm"
                                >
                                  <FileText className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                                  Aplicar
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 xs:gap-3 md:gap-4 mt-3 xs:mt-4 md:mt-6 pt-3 xs:pt-4 md:pt-6 border-t border-border/50">
                                <div className="flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs md:text-sm text-muted-foreground">
                                  <CheckCircle className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
                                  <span className="truncate">48h respuesta</span>
                                </div>
                                <div className="flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs md:text-sm text-muted-foreground">
                                  <CheckCircle className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
                                  <span className="truncate">Sin compromiso</span>
                                </div>
                                <div className="flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs md:text-sm text-muted-foreground">
                                  <CheckCircle className="w-3 h-3 xs:w-3.5 xs:h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
                                  <span className="truncate">100% seguro</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </>
                      )}
                      
                      {!showWaitlistForm && availableApartments.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                          className="glass-panel p-3 xs:p-4 mb-4 xs:mb-6 border-accent/30 bg-accent/5"
                        >
                          <div className="flex items-start gap-2 xs:gap-3">
                            <Sparkles className="w-4 h-4 xs:w-5 xs:h-5 text-accent mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-accent mb-0.5 xs:mb-1 text-sm xs:text-base">
                                Explora espacios
                              </h3>
                              <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">
                                Conoce los espacios que podrían ser tu próximo hogar.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex items-center gap-2 xs:gap-3 mb-4 xs:mb-6"
                  >
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <h2 className="font-display text-sm xs:text-base md:text-lg font-semibold text-muted-foreground whitespace-nowrap">
                      {isAuthenticated && userHasApartments 
                        ? t.home.yourSpaces 
                        : t.home.available
                      }
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-border via-transparent to-transparent" />
                  </motion.div>

                  {displayedApartments.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-panel p-8 text-center"
                    >
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-2">
                        {isAuthenticated && userLoading
                          ? 'Cargando tus espacios asignados...'
                          : isAuthenticated 
                            ? 'Aún no tienes espacios asignados'
                            : 'No hay espacios disponibles por ahora'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isAuthenticated && userLoading
                          ? 'Por favor espera mientras se cargan los datos.'
                          : isAuthenticated
                            ? 'Contacta a la administración para más información.'
                            : 'Vuelve pronto o contáctanos para conocer disponibilidad.'
                        }
                      </p>
                    </motion.div>
                  ) : (
                    <>
                      <ApartmentGrid
                        apartments={formattedApartments}
                        onApartmentClick={(apt) => {
                          const firebaseApt = displayedApartments.find(a => a.apartmentId === apt.id);
                          if (firebaseApt) {
                            setSelectedApartment(firebaseApt);
                          }
                        }}
                      />
                      
                      {isAuthenticated && !userHasApartments && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                          className="mt-6 text-center"
                        >
                          <p className="text-sm text-muted-foreground mb-4">
                            Selecciona un espacio para solicitar estudio
                          </p>
                        </motion.div>
                      )}
                    </>
                  )}
                </>
              )}

              <Dialog open={studyRequestDialogOpen} onOpenChange={setStudyRequestDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Solicitar estudio</DialogTitle>
                    <DialogDescription>
                      Completa el formulario para coordinar una visita al espacio {selectedApartmentForStudy?.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="study-name">Nombre completo</Label>
                      <Input
                        id="study-name"
                        value={studyRequestData.name}
                        onChange={(e) => setStudyRequestData({ ...studyRequestData, name: e.target.value })}
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="study-email">Correo electrónico</Label>
                      <Input
                        id="study-email"
                        type="email"
                        value={studyRequestData.email}
                        onChange={(e) => setStudyRequestData({ ...studyRequestData, email: e.target.value })}
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="study-phone">Teléfono</Label>
                      <Input
                        id="study-phone"
                        type="tel"
                        value={studyRequestData.phone}
                        onChange={(e) => setStudyRequestData({ ...studyRequestData, phone: e.target.value })}
                        placeholder="+57 300 123 4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="study-message">Mensaje adicional</Label>
                      <Textarea
                        id="study-message"
                        value={studyRequestData.message}
                        onChange={(e) => setStudyRequestData({ ...studyRequestData, message: e.target.value })}
                        placeholder="¿Qué te interesa de este espacio?"
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStudyRequestDialogOpen(false);
                        setSelectedApartmentForStudy(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmitStudyRequest}>
                      <FileText className="w-4 h-4 mr-2" />
                      Enviar Solicitud
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
