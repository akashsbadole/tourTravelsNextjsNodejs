import HotelSearchEnhanced from "@/components/hotels/search/HotelSearchEnhanced";
import { HotelSearchErrorBoundary } from "@/components/error-handling/HotelSearchErrorBoundary";

export default function HotelSearchPage() {
  return (
    <HotelSearchErrorBoundary>
      <HotelSearchEnhanced />
    </HotelSearchErrorBoundary>
  );
}
