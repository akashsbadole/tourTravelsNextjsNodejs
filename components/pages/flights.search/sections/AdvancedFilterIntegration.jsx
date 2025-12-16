/**
 * Advanced Filter Integration Component
 * Connects advanced filtering system with existing flight search
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';

import {
  selectActiveFilters,
  selectFilterResults,
  selectFilterUI,
  setActiveFilter,
  applyFilters,
  addToHistory,
  analyzeFilterUsage,
  saveFilterPreset
} from '@/reduxStore/features/advancedFlightFiltersSlice';

import { flightFilterEngine } from '@/lib/filters/filterEngine';
import { filterPersistence } from '@/lib/filters/filterPersistence';
import { 
  filterAnalytics,
  trackFilterApplication,
  trackSearchResultInteraction,
  generateFilterRecommendations
} from '@/lib/filters/filterAnalytics';

import {
  FILTER_CATEGORIES,
  DEFAULT_FILTER_CONFIGS,
  getActiveFiltersCount,
  exportFilters
} from '@/lib/filters/advancedFlightFilters';

import AdvancedFlightFilter from './AdvancedFlightFilter';
import MobileAdvancedFilter, { MobileFilterTrigger } from './MobileAdvancedFilter';
import { cn } from '@/lib/utils';

export function AdvancedFilterIntegration({ 
  flights = [], 
  onFilteredResults,
  className,
  showMobileTrigger = true 
}) {
  const dispatch = useDispatch();
  
  // Redux state
  const activeFilters = useSelector(selectActiveFilters);
  const filterResults = useSelector(selectFilterResults);
  const filterUI = useSelector(selectFilterUI);
  
  // Local state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Initialize filters from persistence
  useEffect(() => {
    const initializeFilters = async () => {
      try {
        // Load saved active filters
        const savedFilters = await filterPersistence.loadActiveFilters();
        
        if (savedFilters && Object.keys(savedFilters).length > 0) {
          for (const [category, value] of Object.entries(savedFilters)) {
            dispatch(setActiveFilter({ category, value }));
          }
        }

        // Load available options from flight data
        updateAvailableOptions(flights);

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing filters:', error);
        setIsInitialized(true);
      }
    };

    initializeFilters();
  }, [dispatch]);

  // Update available options when flights change
  const updateAvailableOptions = useCallback((flightData) => {
    if (!flightData || flightData.length === 0) return;

    const options = {
      [FILTER_CATEGORIES.AIRLINES]: extractAirlineOptions(flightData),
      [FILTER_CATEGORIES.AIRPORTS]: extractAirportOptions(flightData),
      [FILTER_CATEGORIES.AIRCRAFT]: extractAircraftOptions(flightData)
    };

    // Update available options in Redux store
    for (const [category, categoryOptions] of Object.entries(options)) {
      if (categoryOptions.length > 0) {
        // This would dispatch to update available options
        // dispatch(setAvailableOptions({ category, options: categoryOptions }));
      }
    }
  }, []);

  // Apply filters with debouncing
  const applyFiltersWithDebounce = useCallback(async (filters) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Track filter application
      trackFilterApplication(filters, { 
        source: filterUI.sidebarOpen ? 'sidebar' : 'mobile',
        timestamp: Date.now()
      });

      // Apply filters using the filter engine
      const result = await dispatch(applyFilters({ 
        flights, 
        filters, 
        options: { 
          includeMetadata: true,
          enableCache: true 
        }
      })).unwrap();

      // Track search results
      trackSearchResultInteraction(
        flights.length,
        result.filteredCount,
        { filterCount: getActiveFiltersCount(filters) }
      );

      // Save filters to persistence
      await filterPersistence.saveActiveFilters(filters, {
        resultCount: result.filteredCount,
        timestamp: new Date().toISOString()
      });

      // Add to history
      await dispatch(addToHistory({ 
        filters, 
        searchState: { resultCount: result.filteredCount }
      }));

      // Generate recommendations
      const newRecommendations = await generateFilterRecommendations(filters, result.flights);
      setRecommendations(newRecommendations);
      setShowRecommendations(newRecommendations.length > 0);

      // Notify parent component
      if (onFilteredResults) {
        onFilteredResults(result.flights, result.metadata);
      }

    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, flights, isLoading, onFilteredResults, filterUI.sidebarOpen]);

  // Apply filters when active filters change
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      applyFiltersWithDebounce(activeFilters);
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timeoutId);
  }, [activeFilters, isInitialized, applyFiltersWithDebounce]);

  // Update available options when flights change
  useEffect(() => {
    updateAvailableOptions(flights);
  }, [flights, updateAvailableOptions]);

  // Analyze filter usage periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(analyzeFilterUsage());
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [dispatch]);

  // Extract airline options from flight data
  const extractAirlineOptions = (flightData) => {
    const airlines = new Set();
    
    flightData.forEach(flight => {
      const airline = flight.carrierInCharge?._id || flight.airlineId?._id;
      if (airline) {
        airlines.add(airline);
      }
    });

    return Array.from(airlines).map(airline => ({
      value: airline,
      label: airline, // Would map to full name in real implementation
      count: flightData.filter(f => 
        (f.carrierInCharge?._id || f.airlineId?._id) === airline
      ).length
    }));
  };

  // Extract airport options from flight data
  const extractAirportOptions = (flightData) => {
    const departureAirports = new Set();
    const arrivalAirports = new Set();
    
    flightData.forEach(flight => {
      if (flight.segmentIds && flight.segmentIds.length > 0) {
        const firstSegment = flight.segmentIds[0];
        const lastSegment = flight.segmentIds[flight.segmentIds.length - 1];
        
        if (firstSegment?.from?.airport?.iataCode) {
          departureAirports.add(firstSegment.from.airport.iataCode);
        }
        
        if (lastSegment?.to?.airport?.iataCode) {
          arrivalAirports.add(lastSegment.to.airport.iataCode);
        }
      }
    });

    return {
      departure: Array.from(departureAirports).map(airport => ({
        value: airport,
        label: airport,
        count: flightData.filter(f => {
          if (f.segmentIds && f.segmentIds.length > 0) {
            return f.segmentIds[0].from?.airport?.iataCode === airport;
          }
          return false;
        }).length
      })),
      arrival: Array.from(arrivalAirports).map(airport => ({
        value: airport,
        label: airport,
        count: flightData.filter(f => {
          if (f.segmentIds && f.segmentIds.length > 0) {
            const lastSegment = f.segmentIds[f.segmentIds.length - 1];
            return lastSegment.to?.airport?.iataCode === airport;
          }
          return false;
        }).length
      }))
    };
  };

  // Extract aircraft options from flight data
  const extractAircraftOptions = (flightData) => {
    const aircraft = new Set();
    
    flightData.forEach(flight => {
      if (flight.aircraft) {
        aircraft.add(flight.aircraft);
      }
    });

    return Array.from(aircraft).map(type => ({
      value: type,
      label: type,
      count: flightData.filter(f => f.aircraft === type).length
    }));
  };

  // Handle filter preset creation
  const handleSavePreset = async (presetData) => {
    try {
      await dispatch(saveFilterPreset(presetData)).unwrap();
      
      // Track preset creation
      filterAnalytics.trackEvent({
        type: 'preset_creation',
        presetName: presetData.name,
        filterCount: getActiveFiltersCount(presetData.filters)
      });
    } catch (error) {
      console.error('Error saving preset:', error);
    }
  };

  // Handle filter sharing
  const handleShareFilters = async () => {
    try {
      const filterString = exportFilters(activeFilters);
      const shareUrl = `${window.location.origin}${window.location.pathname}?filters=${encodeURIComponent(btoa(filterString))}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'Flight Filters',
          text: 'Check out these flight filters',
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        // Show toast notification
      }
    } catch (error) {
      console.error('Error sharing filters:', error);
    }
  };

  // Filter statistics
  const filterStats = useMemo(() => {
    if (!filterResults.metadata?.filterStats) return null;

    const stats = {
      totalFlights: flights.length,
      filteredFlights: filterResults.filteredCount,
      filterEffectiveness: flights.length > 0 ? filterResults.filteredCount / flights.length : 0,
      activeFilters: getActiveFiltersCount(activeFilters),
      processingTime: filterResults.metadata.performance?.averageTime || 0
    };

    return stats;
  }, [flights.length, filterResults, activeFilters]);

  if (!isInitialized) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading filters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col lg:flex-row gap-6", className)}>
      {/* Desktop Filters Sidebar */}
      <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
        <AdvancedFlightFilter
          onApplyFilters={applyFiltersWithDebounce}
          availableFlights={filterResults.flights}
          className="sticky top-4"
        />
      </div>

      {/* Mobile Filter Trigger */}
      {showMobileTrigger && (
        <MobileFilterTrigger
          activeFiltersCount={getActiveFiltersCount(activeFilters)}
          onClick={() => setMobileFiltersOpen(true)}
          className="lg:hidden"
        />
      )}

      {/* Mobile Filters */}
      <MobileAdvancedFilter
        isOpen={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
        onApplyFilters={applyFiltersWithDebounce}
        availableFlights={filterResults.flights}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Filter Statistics Bar */}
        {filterStats && (
          <motion.div
            className="bg-card border border-border rounded-lg p-4 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {filterStats.filteredFlights} of {filterStats.totalFlights} flights
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(filterStats.filterEffectiveness * 100)}% match rate
                  </p>
                </div>
                
                {filterStats.activeFilters > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {filterStats.activeFilters} filter{filterStats.activeFilters !== 1 ? 's' : ''} applied
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {filterStats.processingTime > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {filterStats.processingTime.toFixed(1)}ms
                  </div>
                )}
                
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="text-xs text-primary hover:underline"
                >
                  {showRecommendations ? 'Hide' : 'Show'} Recommendations
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recommendations */}
        <AnimatePresence>
          {showRecommendations && recommendations.length > 0 && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3">Smart Recommendations</h3>
                <div className="space-y-2">
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="text-xs">
                      <span className="font-medium">{rec.title}</span>
                      <span className="text-muted-foreground ml-2">{rec.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Applying filters...</p>
            </div>
          </div>
        )}

        {/* Content will be rendered by parent component */}
        {!isLoading && (
          <div className="space-y-4">
            {/* This is where the filtered flight results would be rendered */}
            {/* Parent component should handle the actual rendering */}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvancedFilterIntegration;