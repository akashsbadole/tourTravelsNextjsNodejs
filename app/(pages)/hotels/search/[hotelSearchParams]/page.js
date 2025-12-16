import { SearchStaysForm } from "@/components/sections/SearchStaysForm";
import HotelSearchEnhanced from "@/components/hotels/search/HotelSearchEnhanced";
import { HotelSearchErrorBoundary } from "@/components/error-handling/HotelSearchErrorBoundary";

function HotelSearchQueryPage({ params }) {
  // Parse search parameters from URL
  const searchParams = {};
  
  if (params?.hotelSearchParams) {
    try {
      const urlParams = new URLSearchParams(decodeURIComponent(params.hotelSearchParams));
      const paramsObj = Object.fromEntries(urlParams);
      
      // Convert to format expected by HotelSearchEnhanced
      searchParams.destination = paramsObj.city || '';
      searchParams.checkIn = paramsObj.checkIn ? new Date(parseInt(paramsObj.checkIn)).toISOString().split('T')[0] : '';
      searchParams.checkOut = paramsObj.checkOut ? new Date(parseInt(paramsObj.checkOut)).toISOString().split('T')[0] : '';
      searchParams.guests = {
        adults: parseInt(paramsObj.guests) || 1,
        children: 0,
        rooms: parseInt(paramsObj.rooms) || 1
      };
    } catch (error) {
      console.error('Error parsing hotel search parameters:', error);
    }
  }

  return (
    <HotelSearchErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Hotel Search Component */}
        <HotelSearchEnhanced initialParams={searchParams} />
        
        {/* Legacy Form for Backward Compatibility */}
        <section className="mx-auto mb-8 max-w-6xl rounded-[16px] bg-white px-[24px] py-[32px] shadow-md">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Advanced Search Options</h2>
            <p className="text-gray-600">Use the form below for additional search options</p>
          </div>
          <SearchStaysForm params={params} />
        </section>
      </div>
    </HotelSearchErrorBoundary>
  );
}

export default HotelSearchQueryPage;
