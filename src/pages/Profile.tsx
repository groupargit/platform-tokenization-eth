import { useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useFirebaseUserCached, useFirebaseApartmentsCached } from "@/hooks/useFirebaseWithCache";
import { getUserIdFromEmail } from "@/hooks/useFirebase";
import { 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Home, 
  Bell, 
  Shield, 
  ChevronDown, 
  ChevronUp,
  Edit2,
  Smartphone,
  Check,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/i18n";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";

function getBadgeEmoji(level: number): string {
  if (level >= 10) return "🏆";
  if (level >= 7) return "⭐";
  if (level >= 5) return "🌟";
  if (level >= 3) return "✨";
  return "🌱";
}

function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateString;
  }
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full glass-panel p-3 md:p-4 flex items-center justify-between hover:border-primary/30 transition-colors touch-manipulation">
          <div className="flex items-center gap-2 md:gap-3">
            {icon}
            <span className="font-medium text-sm md:text-base">{title}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="glass-panel p-3 md:p-4 mt-1 border-t-0 rounded-t-none">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Profile() {
  const { user: authUser } = useAuth();
  const userId = getUserIdFromEmail(authUser?.email);
  const { user: firebaseUser, loading: userLoading } = useFirebaseUserCached(userId);
  const { apartments } = useFirebaseApartmentsCached();
  const { primaryColor: apartmentColor } = useApartmentColor();

  const primaryApartmentId = firebaseUser?.primaryApartment;
  const primaryApartment = primaryApartmentId
    ? apartments.find(apt => apt.apartmentId === primaryApartmentId)
    : null;

  const deviceCount = firebaseUser?.devices ? Object.keys(firebaseUser.devices).length : 0;

  const { t } = useLanguage();

  const userData = {
    name: firebaseUser?.name || authUser?.name || t.profile.roles.user,
    email: firebaseUser?.email || authUser?.email || "",
    phone: firebaseUser?.phone || "",
    documentId: firebaseUser?.documentId || "",
    role: firebaseUser?.role === "owner" ? t.profile.roles.owner : firebaseUser?.role === "resident" ? t.profile.roles.resident : t.profile.roles.user,
    status: firebaseUser?.state || "active",
    gamification: {
      level: firebaseUser?.gamification?.level || 1,
      points: firebaseUser?.gamification?.points || 0,
      nextLevelPoints: firebaseUser?.gamification?.nextLevel?.points || 500,
      badge: getBadgeEmoji(firebaseUser?.gamification?.level || 1),
    },
    apartment: primaryApartment ? {
      name: primaryApartment.name || "",
      concept: primaryApartment.concept || "",
      contract: primaryApartment.contractDetails ? {
        monthlyRent: primaryApartment.contractDetails.monthlyRent || 0,
        startDate: formatDate(primaryApartment.contractDetails.startDate),
        endDate: formatDate(primaryApartment.contractDetails.endDate),
        paymentMethod: primaryApartment.contractDetails.paymentMethod || "N/A",
        daysLate: primaryApartment.contractDetails.dayPastDue || 0,
      } : null,
    } : null,
    devices: deviceCount,
    notifications: {
      email: firebaseUser?.notifications?.email || false,
      push: firebaseUser?.notifications?.push || false,
      sms: firebaseUser?.notifications?.sms || false,
    },
    security: {
      twoFactorEnabled: firebaseUser?.cybersecurity?.twoFactorAuthEnabled || false,
      lastPasswordChange: formatDate(firebaseUser?.cybersecurity?.lastPasswordChange),
    },
  };

  const progress = userData.gamification.nextLevelPoints > 0
    ? (userData.gamification.points / userData.gamification.nextLevelPoints) * 100
    : 0;

  if (userLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-3 md:space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-4 md:p-6 text-center"
        >
          <Avatar 
            className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-3 md:mb-4 ring-4"
            style={{ '--tw-ring-color': `${apartmentColor}33` } as React.CSSProperties}
          >
            <AvatarImage src={authUser?.picture} alt={userData.name} />
            <AvatarFallback 
              className="text-xl md:text-2xl"
              style={{ backgroundColor: `${apartmentColor}20`, color: apartmentColor }}
            >
              {userData.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Badge 
            className="absolute -mt-16 md:-mt-20 ml-12 md:ml-16 text-white text-[10px] md:text-xs"
            style={{ backgroundColor: apartmentColor }}
          >
            {userData.role}
          </Badge>
          <h1 className="font-display text-xl md:text-2xl font-bold">{userData.name}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{userData.email}</p>

          <div className="mt-4 md:mt-6 p-3 md:p-4 rounded-xl bg-muted/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xl md:text-2xl">{userData.gamification.badge}</span>
              <span className="font-display font-semibold text-sm md:text-base">
                {t.profile.gamification.level} {userData.gamification.level}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground mb-2">
              <span>{userData.gamification.points} {t.profile.gamification.points}</span>
              <span>/</span>
              <span>{userData.gamification.nextLevelPoints} {t.profile.gamification.points}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-[10px] md:text-xs text-muted-foreground mt-2">
              {userData.gamification.nextLevelPoints - userData.gamification.points} {t.profile.gamification.pointsToNext} {userData.gamification.level + 1}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CollapsibleSection
            title={t.profile.personalInfo}
            icon={<User className="w-4 h-4 md:w-5 md:h-5 text-primary" />}
            defaultOpen={true}
          >
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-muted-foreground">{t.profile.name}</p>
                    <p className="font-medium text-sm md:text-base truncate">{userData.name}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 md:h-9 md:w-9">
                  <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-xs text-muted-foreground">{t.profile.email}</p>
                  <p className="font-medium text-sm md:text-base truncate">{userData.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-muted-foreground">{t.profile.phone}</p>
                    <p className="font-medium text-sm md:text-base">{userData.phone || t.profile.notRegistered}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 md:h-9 md:w-9">
                  <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              </div>
              {userData.documentId && (
                <div className="flex items-center gap-2 md:gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">{t.profile.document}</p>
                    <p className="font-medium text-sm md:text-base">{userData.documentId}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 md:gap-3">
                <Badge variant={userData.status === "active" ? "default" : "secondary"} className="text-[10px] md:text-xs">
                  <Check className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
                  {userData.status === "active" ? t.profile.status.active : t.profile.status.inactive}
                </Badge>
              </div>
            </div>
          </CollapsibleSection>
        </motion.div>

        {userData.apartment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <CollapsibleSection
              title={t.profile.apartment.title}
              icon={<Home className="w-4 h-4 md:w-5 md:h-5 text-primary" />}
            >
              <div className="space-y-3 md:space-y-4">
                <div>
                  <p className="font-medium text-sm md:text-base">{userData.apartment.name}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{userData.apartment.concept}</p>
                </div>
                {userData.apartment.contract && (
                  <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                    <div>
                      <p className="text-muted-foreground">{t.profile.apartment.monthlyRent}</p>
                      <p className="font-medium">${userData.apartment.contract.monthlyRent.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.profile.apartment.paymentMethod}</p>
                      <p className="font-medium">{userData.apartment.contract.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.profile.apartment.startDate}</p>
                      <p className="font-medium">{userData.apartment.contract.startDate}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.profile.apartment.endDate}</p>
                      <p className="font-medium">{userData.apartment.contract.endDate}</p>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CollapsibleSection
            title={t.profile.devices.title}
            icon={<Smartphone className="w-4 h-4 md:w-5 md:h-5 text-primary" />}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm md:text-base">{userData.devices} {t.profile.devices.count}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{t.profile.devices.activeInAccount}</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs md:text-sm h-8 md:h-9">{t.profile.devices.manage}</Button>
            </div>
          </CollapsibleSection>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <CollapsibleSection
            title={t.profile.notifications.title}
            icon={<Bell className="w-4 h-4 md:w-5 md:h-5 text-primary" />}
          >
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm md:text-base">{t.profile.notifications.email}</p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{t.profile.notifications.emailDesc}</p>
                </div>
                <Switch checked={userData.notifications.email} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm md:text-base">{t.profile.notifications.push}</p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{t.profile.notifications.pushDesc}</p>
                </div>
                <Switch checked={userData.notifications.push} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm md:text-base">{t.profile.notifications.sms}</p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{t.profile.notifications.smsDesc}</p>
                </div>
                <Switch checked={userData.notifications.sms} />
              </div>
            </div>
          </CollapsibleSection>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CollapsibleSection
            title={t.profile.security.title}
            icon={<Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />}
          >
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm md:text-base">{t.profile.security.twoFactor}</p>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{t.profile.security.twoFactorDesc}</p>
                </div>
                <Switch checked={userData.security.twoFactorEnabled} />
              </div>
              {userData.security.lastPasswordChange && (
                <div className="flex items-center gap-2 md:gap-3">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">{t.profile.security.lastPasswordChange}</p>
                    <p className="font-medium text-sm md:text-base">{userData.security.lastPasswordChange}</p>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
