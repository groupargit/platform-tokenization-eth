import { Home, Users, Wallet, User, ChevronLeft, ChevronRight, Trophy, Cpu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import casaColorLogo from "@/assets/casa-color-logo.png";
import grouparLogo from "@/assets/groupar-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useFirebaseUser, getUserIdFromEmail } from "@/hooks/useFirebase";
import { useLanguage } from "@/i18n";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";

// Helper function to get badge emoji based on level
function getBadgeEmoji(level: number): string {
  if (level >= 10) return "🏆";
  if (level >= 7) return "⭐";
  if (level >= 5) return "🌟";
  if (level >= 3) return "✨";
  return "🌱";
}

interface AppSidebarProps {
  isAuthenticated?: boolean;
}

export function AppSidebar({ isAuthenticated }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";
  const { user: authUser } = useAuth();
  const { t } = useLanguage();
  const { primaryColor, secondaryColor } = useApartmentColor();
  
  // Navigation items with translations
  const navigationItems = [
    { title: t.nav.dashboard, url: "/dashboard", icon: Home },
    { title: t.nav.devices, url: "/devices", icon: Cpu },
    { title: t.nav.community, url: "/community", icon: Users },
    { title: t.nav.wallet, url: "/wallet", icon: Wallet },
    { title: t.nav.profile, url: "/profile", icon: User },
  ];
  
  // Get userId from email
  const userId = getUserIdFromEmail(authUser?.email);
  const { user: firebaseUser, loading: userLoading } = useFirebaseUser(userId);

  // Don't render sidebar if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Get gamification data from Firebase or use defaults
  const gamificationData = firebaseUser?.gamification
    ? {
        level: firebaseUser.gamification.level || 1,
        points: firebaseUser.gamification.points || 0,
        nextLevelPoints: firebaseUser.gamification.nextLevel?.points || 500,
        badge: getBadgeEmoji(firebaseUser.gamification.level || 1),
      }
    : {
        level: 1,
        points: 0,
        nextLevelPoints: 500,
        badge: "🌱",
      };

  const progress = gamificationData.nextLevelPoints > 0
    ? (gamificationData.points / gamificationData.nextLevelPoints) * 100
    : 0;
  const pointsToNext = Math.max(0, gamificationData.nextLevelPoints - gamificationData.points);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar-background"
    >
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <img
              src={casaColorLogo}
              alt="Casa Color"
              className="w-10 h-10 object-contain"
            />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-display font-semibold text-lg gradient-text">
                  Casa Color
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">by</span>
                  <img
                    src={grouparLogo}
                    alt="Groupar"
                    className="h-3 object-contain"
                  />
                </div>
              </div>
            )}
          </NavLink>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={isCollapsed ? item.title : undefined}
                      className="transition-all duration-200"
                      style={isActive ? {
                        backgroundColor: `${primaryColor}20`,
                        borderLeft: `2px solid ${primaryColor}`,
                      } : undefined}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <Icon 
                          className="w-5 h-5 transition-colors"
                          style={{ color: isActive ? primaryColor : undefined }}
                        />
                        {!isCollapsed && (
                          <span 
                            className="font-medium"
                            style={{ color: isActive ? primaryColor : undefined }}
                          >
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Gamification */}
      <SidebarFooter className="border-t border-sidebar-border p-4">
        {userLoading ? (
          <div className="glass-panel p-3 space-y-3">
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : !isCollapsed ? (
          <div className="glass-panel p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{gamificationData.badge}</span>
                <div>
                  <p className="text-sm font-medium">{t.profile.gamification.level} {gamificationData.level}</p>
                  <p className="text-xs text-muted-foreground">
                    {gamificationData.points.toLocaleString()} {t.profile.gamification.points}
                  </p>
                </div>
              </div>
              <Trophy className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div className="space-y-1">
              <Progress 
                value={progress} 
                className="h-2" 
                indicatorColor={primaryColor}
              />
              <p className="text-[10px] text-muted-foreground text-center">
                {pointsToNext} {t.profile.gamification.pointsToNext} {gamificationData.level + 1}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 p-2 glass-panel rounded-lg" title={`${t.profile.gamification.level} ${gamificationData.level} - ${gamificationData.points} ${t.profile.gamification.points}`}>
            <span className="text-xl">{gamificationData.badge}</span>
            <span className="text-xs font-medium">Lv.{gamificationData.level}</span>
          </div>
        )}

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full mt-2 text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">{t.home.collapse}</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
