import { Bell, LogIn, LogOut, Settings, User, ChevronRight, Menu } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/i18n";
import { LanguageSelector } from "./LanguageSelector";
import casaColorLogo from "@/assets/casa-color-logo.png";

interface TopNavProps {
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  isAuthenticated?: boolean;
  hasSidebar?: boolean;
}

export function TopNav({ userName = "Invitado", userEmail, onLogout, isAuthenticated, hasSidebar = true }: TopNavProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Breadcrumb configuration - uses translations
  const routeLabels: Record<string, string> = {
    "/dashboard": t.nav.dashboard,
    "/community": t.nav.community,
    "/wallet": t.nav.wallet,
    "/profile": t.nav.profile,
    "/devices": t.nav.devices,
    "/notifications": t.profile.notifications.title,
    "/settings": t.nav.settings,
  };
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isMobile = useIsMobile();

  // Generate breadcrumbs from current path
  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ label: t.nav.home, path: "/" }];

    let currentPath = "";
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentPageTitle = routeLabels[location.pathname] || t.landing.title;

  return (
    <header 
      className="fixed top-0 right-0 z-40 h-12 xs:h-14 md:h-16 border-b border-border/50 bg-background/95 backdrop-blur-xl transition-all duration-200"
      style={{ left: hasSidebar && !isMobile ? (isCollapsed ? "var(--sidebar-width-icon)" : "var(--sidebar-width)") : "0" }}
    >
      <div className="flex items-center justify-between h-full px-2 xs:px-3 md:px-4 lg:px-6">
        {/* Left side: Logo + Title (mobile) or Sidebar trigger + Breadcrumbs (desktop) */}
        <div className="flex items-center gap-1.5 xs:gap-2 md:gap-4 min-w-0 flex-1">
          {/* Mobile sidebar trigger */}
          {hasSidebar && isMobile && <SidebarTrigger className="shrink-0 h-8 w-8" />}

          {/* Logo - always show on mobile, conditional on desktop */}
          {(isMobile || !hasSidebar || isCollapsed) && (
            <Link to="/" className="flex items-center gap-1.5 xs:gap-2 shrink-0">
              <img
                src={casaColorLogo}
                alt="Casa Color"
                className="w-6 h-6 xs:w-7 xs:h-7 md:w-8 md:h-8 object-contain"
              />
              {!isMobile && (
                <span className="font-display font-semibold gradient-text hidden sm:block text-sm md:text-base">
                  Casa Color
                </span>
              )}
            </Link>
          )}

          {/* Mobile: Current page title */}
          {isMobile && (
            <h1 className="font-display font-semibold text-xs xs:text-sm truncate">
              {currentPageTitle}
            </h1>
          )}

          {/* Desktop: Breadcrumbs */}
          {!isMobile && (
            <nav className="hidden md:flex items-center gap-1.5 text-sm min-w-0">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-1.5 min-w-0">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-foreground truncate">{crumb.label}</span>
                  ) : (
                    <Link
                      to={crumb.path}
                      className="text-muted-foreground hover:text-foreground transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* Right side: Language + Notifications + User menu */}
        <div className="flex items-center gap-0.5 xs:gap-1 md:gap-2 shrink-0">
          {/* Language Selector - always visible */}
          <LanguageSelector />
          
          {isAuthenticated && (
            <>
              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 xs:h-9 xs:w-9 md:h-10 md:w-10"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="w-3.5 h-3.5 xs:w-4 xs:h-4 md:w-5 md:h-5" />
                <Badge className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 xs:h-4 xs:w-4 md:h-5 md:w-5 flex items-center justify-center p-0 text-[8px] xs:text-[9px] md:text-[10px] bg-destructive">
                  3
                </Badge>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 xs:h-9 xs:w-9 md:h-10 md:w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0"
                  >
                    <Avatar className="h-8 w-8 xs:h-9 xs:w-9 md:h-10 md:w-10">
                      <AvatarImage src="" alt={userName} />
                      <AvatarFallback className="bg-primary/20 text-primary font-medium text-[10px] xs:text-xs md:text-sm">
                        {userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 glass-panel" align="end" forceMount>
                  {/* User info */}
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/20 text-primary text-lg">
                        {userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{userName}</p>
                      {userEmail && (
                        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                      )}
                      <Badge variant="secondary" className="w-fit mt-1 text-[10px]">
                        ⭐ Nivel 3
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  {/* Quick links */}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate("/notifications")}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notificaciones</span>
                    <Badge className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                      3
                    </Badge>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate("/profile")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi Perfil</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate("/wallet")}
                  >
                    <span className="mr-2">💰</span>
                    <span>Gana Siempre</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={onLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!isAuthenticated && (
            <Button onClick={() => navigate("/auth")} className="gap-1.5 xs:gap-2 h-8 xs:h-9 text-xs xs:text-sm md:h-10 md:text-base px-2.5 xs:px-3 md:px-4">
              <LogIn className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              <span className="hidden xs:inline">Iniciar Sesión</span>
              <span className="xs:hidden">Entrar</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
