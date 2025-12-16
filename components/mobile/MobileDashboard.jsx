"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { MobileButton } from "./MobileButton";
import { MobileSwipeCarousel } from "./MobileSwipeCarousel";
import { 
  Plane,
  Hotel,
  Calendar,
  TrendingUp,
  Star,
  Clock,
  MapPin,
  CreditCard,
  Bell,
  Settings,
  User,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Activity,
  DollarSign,
  Users,
  Eye,
  Heart,
  Bookmark,
  Search,
  Filter
} from "lucide-react";

const MobileDashboard = ({
  user,
  stats,
  recentBookings,
  upcomingTrips,
  favorites,
  notifications,
  className,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showNotifications, setShowNotifications] = useState(false);

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "bookings", label: "Bookings", icon: Calendar },
    { id: "trips", label: "Trips", icon: MapPin },
    { id: "favorites", label: "Favorites", icon: Heart },
  ];

  const StatCard = ({ icon: Icon, label, value, change, changeType, color = "primary" }) => (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          `bg-${color}/10 text-${color}`
        )}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            changeType === "increase" ? "text-green-600" : "text-red-600"
          )}>
            {changeType === "increase" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {change}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );

  const BookingCard = ({ booking, type }) => {
    const isFlight = type === "flight";
    const Icon = isFlight ? Plane : Hotel;
    
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {isFlight ? booking.flightNumber : booking.hotelName}
              </p>
              <p className="text-sm text-muted-foreground">
                {isFlight ? booking.airline : booking.location}
              </p>
            </div>
          </div>
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            booking.status === "confirmed" ? "bg-green-100 text-green-800" :
            booking.status === "pending" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          )}>
            {booking.status}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{booking.date}</span>
          </div>
          {isFlight ? (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{booking.route}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{booking.duration}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <p className="font-semibold text-foreground">${booking.price}</p>
          <MobileButton variant="outline" size="compact">
            View Details
          </MobileButton>
        </div>
      </div>
    );
  };

  const TripCard = ({ trip }) => (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      <div className="relative h-32">
        <img
          src={trip.image}
          alt={trip.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 text-white">
          <p className="font-semibold">{trip.destination}</p>
          <p className="text-sm opacity-90">{trip.dates}</p>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{trip.travelers} travelers</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{trip.duration}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground">${trip.totalCost}</p>
          <MobileButton variant="outline" size="compact">
            Manage Trip
          </MobileButton>
        </div>
      </div>
    </div>
  );

  const FavoriteCard = ({ item }) => {
    const isFlight = item.type === "flight";
    const Icon = isFlight ? Plane : Hotel;
    
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              {isFlight ? item.route : item.location}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{item.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm font-semibold text-primary">${item.price}</span>
            </div>
          </div>
          <MobileButton variant="ghost" size="compact" className="p-2">
            <Heart className="h-4 w-4 fill-destructive text-destructive" />
          </MobileButton>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Welcome Message */}
            <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-4 text-white">
              <p className="text-sm opacity-90">Welcome back,</p>
              <p className="text-xl font-bold">{user.name}</p>
              <p className="text-sm opacity-90 mt-1">Ready for your next adventure?</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={TrendingUp}
                label="Total Trips"
                value={stats.totalTrips}
                change="+12%"
                changeType="increase"
                color="blue"
              />
              <StatCard
                icon={DollarSign}
                label="Total Spent"
                value={`$${stats.totalSpent}`}
                change="+8%"
                changeType="increase"
                color="green"
              />
              <StatCard
                icon={Bookmark}
                label="Saved"
                value={stats.savedItems}
                color="purple"
              />
              <StatCard
                icon={Eye}
                label="Views"
                value={stats.profileViews}
                change="+25%"
                changeType="increase"
                color="orange"
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <MobileButton variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Search className="h-6 w-6" />
                  <span>Search Flights</span>
                </MobileButton>
                <MobileButton variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Hotel className="h-6 w-6" />
                  <span>Find Hotels</span>
                </MobileButton>
                <MobileButton variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Calendar className="h-6 w-6" />
                  <span>My Bookings</span>
                </MobileButton>
                <MobileButton variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Heart className="h-6 w-6" />
                  <span>Favorites</span>
                </MobileButton>
              </div>
            </div>
          </div>
        );

      case "bookings":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Recent Bookings</h3>
              <MobileButton variant="ghost" size="compact">
                <Filter className="h-4 w-4" />
              </MobileButton>
            </div>
            
            {recentBookings.map((booking, index) => (
              <BookingCard key={index} booking={booking} type={booking.type} />
            ))}
          </div>
        );

      case "trips":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Upcoming Trips</h3>
            
            <MobileSwipeCarousel
              items={upcomingTrips.map((trip, index) => (
                <TripCard key={index} trip={trip} />
              ))}
              spaceBetween={16}
              showDots={false}
            />
          </div>
        );

      case "favorites":
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Your Favorites</h3>
            
            {favorites.map((item, index) => (
              <FavoriteCard key={index} item={item} />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("bg-background min-h-screen pb-20", className)}>
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-muted/50"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </button>
              <button className="p-2 rounded-lg hover:bg-muted/50">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {renderContent()}
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowNotifications(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 bg-card shadow-xl">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-lg hover:bg-muted/50"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto h-full pb-20">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className="p-4 border-b border-border hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { MobileDashboard };