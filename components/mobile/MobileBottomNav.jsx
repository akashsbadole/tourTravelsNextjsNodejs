"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { 
  Home, 
  Search, 
  Heart, 
  User, 
  Calendar,
  Plane,
  Hotel,
  Settings,
  Menu
} from "lucide-react";

const MobileBottomNav = ({
  className,
  items,
  showLabel = true,
  activeColor = "primary",
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const defaultItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      id: "flights",
      label: "Flights",
      icon: Plane,
      href: "/flights",
      active: pathname.includes("/flights"),
    },
    {
      id: "hotels",
      label: "Hotels",
      icon: Hotel,
      href: "/hotels",
      active: pathname.includes("/hotels"),
    },
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      href: "/user/my_bookings",
      active: pathname.includes("/my_bookings"),
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      href: "/user/profile",
      active: pathname.includes("/user/profile"),
    },
  ];

  const navItems = items || defaultItems;

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border",
        "md:hidden", // Only show on mobile devices
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 py-1 rounded-lg transition-all duration-200",
                "hover:bg-muted/50 active:scale-95",
                isActive
                  ? `text-${activeColor}`
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "text-current"
                )} 
              />
              {showLabel && (
                <span 
                  className={cn(
                    "text-xs font-medium truncate max-w-[60px]",
                    isActive ? "text-current" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Safe area padding for devices with home indicators */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
};

const MobileBottomNavWithMenu = ({ className, onMenuClick, ...props }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleMenuClick = () => {
    setShowMenu(!showMenu);
    onMenuClick?.();
  };

  const menuItems = [
    {
      id: "menu",
      label: "Menu",
      icon: Menu,
      onClick: handleMenuClick,
    },
    ...props.items?.slice(0, 3) || [],
  ];

  return (
    <>
      <MobileBottomNav
        {...props}
        items={menuItems}
        className={className}
      />
      
      {/* Slide-up menu panel */}
      {showMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border rounded-t-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-6" />
            
            <div className="px-4 pb-6 space-y-2">
              <h3 className="text-lg font-semibold text-foreground mb-4">More Options</h3>
              
              {/* Additional menu items */}
              <button className="flex items-center w-full p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Heart className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="text-foreground">Favorites</span>
              </button>
              
              <button className="flex items-center w-full p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Settings className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="text-foreground">Settings</span>
              </button>
              
              <button className="flex items-center w-full p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Search className="h-5 w-5 mr-3 text-muted-foreground" />
                <span className="text-foreground">Search</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { MobileBottomNav, MobileBottomNavWithMenu };