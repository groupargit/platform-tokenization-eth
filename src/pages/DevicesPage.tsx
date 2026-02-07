import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { generateUserId } from '@/hooks/useFirebaseUserSync';
import { useFirebaseUserCached } from '@/hooks/useFirebaseWithCache';
import { useApartmentDevices, useCommonAreaDevices, type DeviceCategory } from '@/hooks/useApartmentDevices';
import { useEntranceDevices, useFirebaseDevicesFiltered, IoTDevice } from '@/hooks/useFirebaseDevices';
import { useApartmentColor } from '@/contexts/ApartmentColorContext';
import { 
  Loader2, Lightbulb, Shield, Thermometer, Droplets, 
  Activity, Settings, Wifi, WifiOff,
  Info, Lock, Home, Building2, Zap,
  RefreshCw, AlertCircle, CheckCircle2, Cpu, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { QuickAccessControls } from '@/components/devices/QuickAccessControls';
import { InteractiveDeviceCard } from '@/components/devices/InteractiveDeviceCard';
import { useLanguage } from '@/i18n';

function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  color = 'primary'
}: { 
  icon: typeof Activity; 
  value: string | number; 
  label: string; 
  color?: string;
}) {
  return (
    <motion.div
      className={cn(
        "p-2 xs:p-2.5 text-center rounded-xl border border-transparent",
        "bg-background/60 backdrop-blur-sm transition-colors",
        "hover:bg-background/80 hover:border-border/50"
      )}
      whileHover={{ y: -2 }}
      transition={{ type: 'tween', duration: 0.15 }}
    >
      <div className={cn("w-7 h-7 xs:w-8 xs:h-8 mx-auto mb-1.5 rounded-lg flex items-center justify-center bg-muted/50", color)}>
        <Icon className={cn("w-3.5 h-3.5 xs:w-4 xs:h-4", color)} />
      </div>
      <div className="font-display text-base xs:text-lg font-bold tabular-nums leading-none text-foreground">{value}</div>
      <div className="text-[9px] xs:text-[10px] text-muted-foreground truncate mt-1 font-medium">{label}</div>
    </motion.div>
  );
}

function CategorySection({
  category,
  config,
  categoryDevices,
  categoryIndex,
  Icon,
}: {
  category: string;
  config: { label: string; icon: typeof Lightbulb; color: string };
  categoryDevices: IoTDevice[];
  categoryIndex: number;
  Icon: typeof Lightbulb;
}) {
  const [open, setOpen] = useState(true);
  const categoryBg = {
    security: 'bg-emerald-500/10',
    lighting: 'bg-amber-500/10',
    sensors: 'bg-purple-500/10',
    climate: 'bg-sky-500/10',
    water: 'bg-blue-500/10',
    other: 'bg-muted/50',
  }[category] || 'bg-muted/50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: categoryIndex * 0.05 }}
      className={cn(
        "rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden",
        categoryBg
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-3 rounded-t-xl border-b border-border/50",
              "hover:bg-muted/40 transition-colors text-left"
            )}
          >
            <div className="p-2 rounded-lg bg-background/80 border border-border/40">
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide flex-1">
              {config.label}
            </h3>
            <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0">
              {categoryDevices.length}
            </Badge>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 pt-2">
            {categoryDevices.map((device, i) => (
              <motion.div
                key={device.deviceId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                <InteractiveDeviceCard device={device} />
              </motion.div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

function ControllersSection({ esp32Devices }: { esp32Devices: any[] }) {
  const [open, setOpen] = useState(true);
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden bg-sky-500/5"
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-3 rounded-t-xl border-b border-border/50",
              "hover:bg-muted/40 transition-colors text-left"
            )}
          >
            <div className="p-2 rounded-lg bg-background/80 border border-border/40">
              <Cpu className="w-4 h-4 text-sky-500" />
            </div>
            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide flex-1">
              {t.devices.controllers}
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground hover:text-foreground">
                  <Info className="w-4 h-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[180px]">
                <p className="text-xs">{t.devices.esp32Tooltip}</p>
              </TooltipContent>
            </Tooltip>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 pt-2">
            {esp32Devices.map((device, i) => (
              <motion.div
                key={device.deviceId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                <ESP32Card device={device} />
              </motion.div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

function ESP32Card({ device }: { device: any }) {
  const { t } = useLanguage();
  const isOnline = device.status === 'online';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-xl border transition-all duration-200",
        "bg-card/95 backdrop-blur-sm",
        isOnline ? "border-emerald-500/25 shadow-sm" : "border-border/40"
      )}
    >
      <div className={cn(
        "absolute top-0 left-0 bottom-0 w-1 rounded-l-xl",
        isOnline ? "bg-emerald-500/80" : "bg-muted-foreground/30"
      )} />
      <div className="p-3 xs:p-3.5 pl-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              isOnline ? "bg-emerald-500/15" : "bg-muted/60"
            )}>
              <Cpu className={cn("w-4 h-4", isOnline ? "text-emerald-500" : "text-muted-foreground")} />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-xs xs:text-sm truncate">{device.deviceName}</p>
              <p className="text-[10px] xs:text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                {device.location}
                {isOnline ? <Wifi className="w-2.5 h-2.5 text-emerald-500/80" /> : <WifiOff className="w-2.5 h-2.5 text-muted-foreground/60" />}
              </p>
            </div>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"} className="text-[9px] px-2 py-0.5 h-5 shrink-0 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0">
            {isOnline ? t.devices.status.online : t.devices.status.offline}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

export default function DevicesPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const userId = user?.email ? generateUserId(user.email) : null;
  const { user: firebaseUser, loading: userLoading } = useFirebaseUserCached(userId);
  
  const primaryApartmentId = useMemo(() => {
    if (firebaseUser?.primaryApartment) return firebaseUser.primaryApartment;
    
    if (firebaseUser?.apartments && typeof firebaseUser.apartments === 'object') {
      const aptKeys = Object.keys(firebaseUser.apartments);
      const aptId = aptKeys.find(key => key.startsWith('apt_') || key.match(/^[A-Z]\d+$/));
      if (aptId) return aptId;
      
      for (const key of aptKeys) {
        const apt = (firebaseUser.apartments as Record<string, any>)[key];
        if (apt?.apartmentId) return apt.apartmentId;
      }
    }
    
    return null;
  }, [firebaseUser?.primaryApartment, firebaseUser?.apartments]);
  
  const categoryConfig = useMemo(() => ({
    lighting: { 
      label: t.devices.categories.lighting, 
      icon: Lightbulb, 
      color: 'text-amber-500',
      description: t.devices.categories.lighting
    },
    security: { 
      label: t.devices.categories.security, 
      icon: Shield, 
      color: 'text-emerald-500',
      description: t.devices.categories.security
    },
    climate: { 
      label: t.devices.categories.climate, 
      icon: Thermometer, 
      color: 'text-sky-500',
      description: t.devices.categories.climate
    },
    water: { 
      label: t.devices.categories.water, 
      icon: Droplets, 
      color: 'text-blue-500',
      description: t.devices.categories.water
    },
    sensors: { 
      label: t.devices.categories.sensors, 
      icon: Activity, 
      color: 'text-purple-500',
      description: t.devices.categories.sensors
    },
    other: { 
      label: t.devices.categories.other, 
      icon: Settings, 
      color: 'text-muted-foreground',
      description: t.devices.categories.other
    }
  } as Record<DeviceCategory, { label: string; icon: typeof Lightbulb; color: string; description: string; }>), [t]);
  
  const { 
    devices: userIoTDevices, 
    stats: iotDevicesStats,
    loading: iotDevicesLoading 
  } = useFirebaseDevicesFiltered({
    buildingId: 'B001',
    apartmentId: primaryApartmentId,
    onlyOnline: true,
    includeCommonAreas: true
  });
  
  const { 
    zone, 
    esp32Devices,
    loading: apartmentLoading 
  } = useApartmentDevices('B001', primaryApartmentId);
  
  const { zone: commonZone, esp32Devices: commonEsp32 } = useCommonAreaDevices('B001');
  
  const { mainLock, mainGate } = useEntranceDevices('B001');
  
  const [refreshing, setRefreshing] = useState(false);
  
  const isLoading = userLoading || iotDevicesLoading || apartmentLoading;
  
  useApartmentColor();
  
  const iotDevicesByCategory = useMemo(() => {
    const grouped: Record<DeviceCategory, IoTDevice[]> = {
      lighting: [],
      security: [],
      climate: [],
      water: [],
      sensors: [],
      other: []
    };
    
    userIoTDevices.forEach(device => {
      const name = device.name?.toLowerCase() || '';
      const caps = device.capabilities || [];
      const domain = device.integration?.homeAssistant?.domain;
      
      let category: DeviceCategory = 'other';
      
      if (caps.includes('lock') || name.includes('lock') || name.includes('cerrojo') || domain === 'lock') {
        category = 'security';
      } else if (caps.includes('motor') || domain === 'cover' || domain === 'motor') {
        category = 'security';
      } else if (caps.includes('switch') || domain === 'switch') {
        category = 'lighting';
      } else if (caps.includes('brightness') || domain === 'light') {
        category = 'lighting';
      } else if (caps.includes('temperature')) {
        category = 'climate';
      } else if (caps.includes('humidity') || name.includes('water')) {
        category = 'water';
      } else if (caps.some(c => c.includes('sensor')) || name.includes('pir')) {
        category = 'sensors';
      } else if (caps.includes('ble_scanning')) {
        category = 'security';
      }
      
      grouped[category].push(device);
    });
    
    return grouped;
  }, [userIoTDevices]);
  
  const combinedStats = useMemo(() => {
    const actuators = userIoTDevices.filter(d => {
      const domain = d.integration?.homeAssistant?.domain;
      return domain === 'switch' || domain === 'cover' || domain === 'lock' || domain === 'light';
    }).length;
    const sensors = userIoTDevices.length - actuators;
    
    return {
      total: iotDevicesStats.total,
      active: iotDevicesStats.online,
      actuators,
      sensors,
      esp32Online: esp32Devices?.filter(d => d.status === 'online').length || 0,
      esp32Total: esp32Devices?.length || 0
    };
  }, [iotDevicesStats, userIoTDevices, esp32Devices]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };
  
  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>{t.auth.accessRequired}</CardTitle>
              <CardDescription>
                {t.auth.loginToManage}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!primaryApartmentId) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Home className="w-6 h-6 text-amber-500" />
              </div>
              <CardTitle>{t.devices.noAssignedSpace}</CardTitle>
              <CardDescription>
                {t.devices.noDevicesDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                {t.devices.goToDashboard}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-4 xs:space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl p-4 xs:p-5 bg-gradient-to-br from-primary/8 via-background to-accent/5 border border-border/50 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20 shrink-0">
                <Zap className="w-5 h-5 xs:w-6 xs:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-base xs:text-lg sm:text-xl font-bold truncate text-foreground">{t.devices.title}</h1>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {zone?.zoneName || t.devices.subtitle}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 w-9 p-0 shrink-0 rounded-xl hover:bg-primary/10"
              aria-label={refreshing ? t.common.loading : t.common.refresh}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2 xs:gap-3">
            <StatCard icon={Activity} value={combinedStats.total} label={t.devices.total} color="text-primary" />
            <StatCard icon={CheckCircle2} value={combinedStats.active} label={t.devices.active} color="text-emerald-500" />
            <StatCard icon={Zap} value={combinedStats.actuators} label={t.devices.controllable} color="text-amber-500" />
            <StatCard icon={Cpu} value={`${combinedStats.esp32Online}/${combinedStats.esp32Total}`} label={t.devices.controllers} color="text-sky-500" />
          </div>
        </motion.div>
        
        {(mainLock || mainGate) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Card className="overflow-hidden border-border/50 shadow-sm rounded-2xl">
              <CardHeader className="pb-2 p-4 xs:p-5">
                <CardTitle className="text-sm xs:text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  {t.devices.quickAccess}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.devices.controlEntries}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 xs:p-5 pt-0">
                <QuickAccessControls />
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        <Tabs defaultValue="my-space" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10 xs:h-11 p-1 rounded-xl bg-muted/40 border border-border/50">
            <TabsTrigger
              value="my-space"
              className="gap-2 text-xs xs:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.devices.mySpace}</span>
            </TabsTrigger>
            <TabsTrigger
              value="common"
              className="gap-2 text-xs xs:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">{t.devices.commonAreas}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-space" className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/20 p-4 xs:p-5 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border/50">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">{t.devices.mySpace}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {userIoTDevices.length} {t.devices.total.toLowerCase()} · {zone?.zoneName || t.devices.subtitle}
                  </p>
                </div>
              </div>

              {userIoTDevices.length === 0 ? (
                <Card className="rounded-2xl border-dashed border-2 border-muted-foreground/25 bg-muted/10">
                  <CardContent className="py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-base mb-2">{t.devices.noDevices}</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      {t.devices.noDevicesDesc}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {Object.entries(iotDevicesByCategory).map(([category, categoryDevices], categoryIndex) => {
                    if (categoryDevices.length === 0) return null;
                    const config = categoryConfig[category as DeviceCategory];
                    const Icon = config.icon;
                    return (
                      <CategorySection
                        key={category}
                        category={category}
                        config={config}
                        categoryDevices={categoryDevices}
                        categoryIndex={categoryIndex}
                        Icon={Icon}
                      />
                    );
                  })}
                  {esp32Devices.length > 0 && (
                    <ControllersSection esp32Devices={esp32Devices} />
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>
          
          <TabsContent value="common" className="mt-4 space-y-6">
            {commonZone ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <Card className="bg-gradient-to-br from-card to-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: commonZone.colorCode }}
                      />
                      {commonZone.zoneName}
                    </CardTitle>
                    <CardDescription>{commonZone.colorMeaning}</CardDescription>
                  </CardHeader>
                </Card>
                
                {commonEsp32.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-sky-500" />
                      {t.devices.accessControllers}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {commonEsp32.map((device) => (
                        <ESP32Card key={device.deviceId} device={device} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">{t.devices.commonAreas}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.devices.commonAreasEmptyDesc}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
        {zone?.security && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              "rounded-2xl border p-4 flex items-center gap-4",
              zone.security.securityMode.status === 'enabled'
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-muted/20 border-border/50"
            )}
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t.devices.securityMode}: {zone.security.securityMode.status === 'enabled' ? t.devices.securityEnabled : t.devices.securityDisabled}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.devices.lockLabel}: {zone.security.smartLock.status === 'locked' ? t.devices.locked : t.devices.unlocked}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-xs font-medium",
                zone.security.securityMode.status === 'enabled'
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "border-border text-muted-foreground"
              )}
            >
              <CheckCircle2 className={cn("w-3 h-3 mr-1", zone.security.securityMode.status === 'enabled' && "text-emerald-500")} />
              {zone.security.securityMode.status === 'enabled' ? t.devices.securityProtected : t.devices.status.inactive}
            </Badge>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
