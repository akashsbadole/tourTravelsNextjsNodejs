"use client";

import React, { useState } from "react";
import {
  MobileButton,
  MobileInput,
  MobileSwipeCarousel,
  MobileBottomNav,
  MobileFlightSearch,
  MobileFlightResultCard,
  MobileHotelBooking,
  MobilePaymentForm,
  MobileDashboard,
  MobilePullToRefresh,
  MobileModal,
  MobileImage,
  useMobilePerformance,
  useMobileTesting,
  useMobileBundleOptimizer,
} from "@/components/mobile";
import { useMobileModal } from "@/components/mobile/MobileModal";

// Sample data for demonstration
const sampleFlights = [
  {
    id: 1,
    airline: { name: "SkyWings Airlines" },
    flightNumber: "SW 234",
    departure: {
      time: "2024-01-15T08:30:00",
      city: "New York",
    },
    arrival: {
      time: "2024-01-15T11:45:00",
      city: "Los Angeles",
    },
    duration: 375,
    price: 289,
    stops: 0,
    aircraft: "Boeing 737-800",
    amenities: ["wifi", "meal", "entertainment"],
    baggage: { cabin: "1 carry-on", checked: "1 bag up to 23kg" },
    seatsAvailable: 12,
    isFavorite: false,
  },
  {
    id: 2,
    airline: { name: "CloudAir" },
    flightNumber: "CA 567",
    departure: {
      time: "2024-01-15T14:20:00",
      city: "New York",
    },
    arrival: {
      time: "2024-01-15T19:30:00",
      city: "Los Angeles",
    },
    duration: 430,
    price: 245,
    stops: 1,
    aircraft: "Airbus A320",
    amenities: ["wifi"],
    baggage: { cabin: "1 carry-on", checked: "1 bag up to 20kg" },
    seatsAvailable: 8,
    isFavorite: true,
  },
];

const sampleHotel = {
  name: "Grand Plaza Hotel",
  rating: 4.5,
  reviews: 1247,
  price: 189,
  images: [
    { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800" },
    { url: "https://images.unsplash.com/photo-1571896349842-33c89424d416?w=800" },
    { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800" },
  ],
  location: {
    address: "123 Main Street",
    city: "Los Angeles, CA",
  },
  amenities: ["wifi", "parking", "breakfast", "gym", "pool"],
  rooms: [
    {
      id: 1,
      name: "Deluxe Room",
      type: "King Bed",
      price: 189,
      maxGuests: 2,
      bedType: "1 King Bed",
      size: "35 sqm",
      images: [
        { url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400" },
      ],
    },
    {
      id: 2,
      name: "Suite",
      type: "King Bed + Sofa",
      price: 289,
      maxGuests: 4,
      bedType: "1 King Bed + Sofa Bed",
      size: "55 sqm",
      images: [
        { url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400" },
      ],
    },
  ],
  description: "Experience luxury and comfort at the Grand Plaza Hotel, located in the heart of downtown Los Angeles.",
  isFavorite: false,
};

const sampleUser = {
  name: "John Doe",
  email: "john.doe@example.com",
};

const sampleStats = {
  totalTrips: 12,
  totalSpent: 3456,
  savedItems: 8,
  profileViews: 234,
};

const sampleBookings = [
  {
    type: "flight",
    flightNumber: "SW 234",
    airline: "SkyWings Airlines",
    date: "Jan 15, 2024",
    route: "NYC → LAX",
    price: 289,
    status: "confirmed",
  },
  {
    type: "hotel",
    hotelName: "Grand Plaza Hotel",
    location: "Los Angeles, CA",
    date: "Jan 15-18, 2024",
    duration: "3 nights",
    price: 567,
    status: "confirmed",
  },
];

const sampleTrips = [
  {
    destination: "Paris, France",
    dates: "Mar 15-22, 2024",
    travelers: 2,
    duration: "7 days",
    totalCost: 2340,
    image: "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400",
  },
  {
    destination: "Tokyo, Japan",
    dates: "May 10-17, 2024",
    travelers: 2,
    duration: "7 days",
    totalCost: 3200,
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400",
  },
];

const sampleFavorites = [
  {
    type: "flight",
    name: "NYC to LAX",
    route: "New York → Los Angeles",
    rating: 4.2,
    price: 289,
  },
  {
    type: "hotel",
    name: "Grand Plaza Hotel",
    location: "Los Angeles, CA",
    rating: 4.5,
    price: 189,
  },
];

const sampleNotifications = [
  {
    title: "Flight Confirmation",
    message: "Your flight SW 234 has been confirmed",
    time: "2 hours ago",
  },
  {
    title: "Price Drop Alert",
    message: "Hotel prices in Paris have dropped by 15%",
    time: "1 day ago",
  },
];

export default function MobileDemoPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  
  const { measureRender, getMetrics } = useMobilePerformance("MobileDemo");
  const { runTests, getReport } = useMobileTesting("MobileDemo");
  const { bundleConfig, dynamicImport } = useMobileBundleOptimizer();
  const { openModal, closeModal, ModalComponent } = useMobileModal();

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const handleFlightSearch = (searchData) => {
    console.log("Flight search:", searchData);
  };

  const handleFlightSelect = (flight) => {
    setSelectedFlight(flight);
    setShowModal(true);
  };

  const handlePayment = (paymentData) => {
    console.log("Payment:", paymentData);
    setShowPayment(false);
  };

  const runPerformanceTests = async () => {
    await runTests();
    const report = getReport("html");
    console.log("Mobile Test Report:", report);
  };

  const renderMeasurement = measureRender();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <h1 className="text-2xl font-bold text-foreground">Mobile Demo</h1>
        <p className="text-sm text-muted-foreground">Test mobile-optimized components</p>
      </div>

      {/* Performance Controls */}
      <div className="p-4 bg-muted/30 border-b border-border">
        <div className="flex gap-2 flex-wrap">
          <MobileButton
            variant="outline"
            size="compact"
            onClick={runPerformanceTests}
          >
            Run Tests
          </MobileButton>
          <MobileButton
            variant="outline"
            size="compact"
            onClick={() => console.log(getMetrics())}
          >
            Get Metrics
          </MobileButton>
          <MobileButton
            variant="outline"
            size="compact"
            onClick={() => setShowPayment(true)}
          >
            Test Payment
          </MobileButton>
        </div>
        
        {/* Bundle Config Display */}
        <div className="mt-2 p-2 bg-card rounded text-xs">
          <p>Bundle Strategy: {bundleConfig?.chunks}</p>
          <p>Lazy Loading: {bundleConfig?.lazyLoading}</p>
          <p>Compression: {bundleConfig?.compression}</p>
        </div>
      </div>

      {/* Main Content with Pull to Refresh */}
      <MobilePullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-6 p-4">
          {/* Flight Search Component */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Flight Search</h2>
            <MobileFlightSearch onSearch={handleFlightSearch} />
          </section>

          {/* Image Carousel */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Image Gallery</h2>
            <MobileSwipeCarousel
              items={sampleHotel.images.map((img, index) => (
                <MobileImage
                  key={index}
                  src={img.url}
                  alt={`Hotel image ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
              showDots
              autoplay
              autoplayInterval={3000}
            />
          </section>

          {/* Flight Results */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Flight Results</h2>
            <div className="space-y-4">
              {sampleFlights.map((flight) => (
                <MobileFlightResultCard
                  key={flight.id}
                  flight={flight}
                  onSelect={handleFlightSelect}
                />
              ))}
            </div>
          </section>

          {/* Form Components */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Form Components</h2>
            <div className="space-y-4">
              <MobileInput
                type="text"
                label="Name"
                placeholder="Enter your name"
                showSearchIcon
              />
              <MobileInput
                type="date"
                label="Travel Date"
                placeholder="Select date"
              />
              <MobileInput
                type="password"
                label="Password"
                placeholder="Enter password"
                showPasswordToggle
              />
            </div>
          </section>

          {/* Button Variants */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Button Variants</h2>
            <div className="grid grid-cols-2 gap-3">
              <MobileButton variant="primary">Primary</MobileButton>
              <MobileButton variant="secondary">Secondary</MobileButton>
              <MobileButton variant="outline">Outline</MobileButton>
              <MobileButton variant="ghost">Ghost</MobileButton>
              <MobileButton loading>Loading</MobileButton>
              <MobileButton disabled>Disabled</MobileButton>
            </div>
          </section>

          {/* Dashboard Preview */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Dashboard Preview</h2>
            <div className="bg-card rounded-2xl p-4 border border-border">
              <MobileDashboard
                user={sampleUser}
                stats={sampleStats}
                recentBookings={sampleBookings}
                upcomingTrips={sampleTrips}
                favorites={sampleFavorites}
                notifications={sampleNotifications}
                className="bg-transparent"
              />
            </div>
          </section>
        </div>
      </MobilePullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Flight Details Modal */}
      {showModal && selectedFlight && (
        <MobileBottomSheet
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Flight Details"
        >
          <div className="p-4">
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {selectedFlight.airline.name} - {selectedFlight.flightNumber}
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedFlight.departure.city} → {selectedFlight.arrival.city}
            </p>
            <p className="text-2xl font-bold text-primary mb-4">
              ${selectedFlight.price}
            </p>
            <MobileButton
              variant="primary"
              className="w-full"
              onClick={() => setShowModal(false)}
            >
              Close
            </MobileButton>
          </div>
        </MobileBottomSheet>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <MobileFullScreenModal
          isOpen={showPayment}
          onClose={() => setShowPayment(false)}
          title="Payment"
          showBackButton
        >
          <div className="p-4">
            <MobilePaymentForm
              amount={289}
              onPayment={handlePayment}
            />
          </div>
        </MobileFullScreenModal>
      )}

      {/* Modal Component Hook */}
      <ModalComponent />
    </div>
  );
}