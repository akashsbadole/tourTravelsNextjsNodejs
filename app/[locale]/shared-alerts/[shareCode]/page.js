import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import SharedAlertPage from '@/components/priceAlerts/SharedAlertPage';
import { getSharedAlert } from '@/lib/services/socialSharing';

/**
 * Generate metadata for the shared alert page
 * @param {Object} params - Page parameters
 * @returns {Metadata} Page metadata
 */
export async function generateMetadata({ params }) {
  try {
    const { shareCode } = params;
    const alertData = await getSharedAlert(shareCode);
    
    if (!alertData) {
      return {
        title: 'Alert Not Found',
        description: 'The shared price alert could not be found or has expired.'
      };
    }

    const { route, currentPrice, savings } = alertData;
    const routeText = `${route.origin.airportCode} → ${route.destination.airportCode}`;
    const priceText = currentPrice ? `$${currentPrice.amount.toFixed(2)}` : 'Great price';
    const savingsText = savings ? `Save $${savings.amount.toFixed(2)} (${savings.percentage}%)` : '';

    return {
      title: `Flight Deal: ${routeText} - ${priceText}`,
      description: `Check out this flight deal from ${route.origin.city || route.origin.airportCode} to ${route.destination.city || route.destination.airportCode}. ${priceText}${savingsText ? ' - ' + savingsText : ''}`,
      openGraph: {
        title: `Flight Deal: ${routeText}`,
        description: `${priceText}${savingsText ? ' - ' + savingsText : ''}`,
        type: 'website',
        images: [
          {
            url: '/images/flight-deal-og.jpg',
            width: 1200,
            height: 630,
            alt: `Flight deal from ${route.origin.airportCode} to ${route.destination.airportCode}`
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title: `Flight Deal: ${routeText}`,
        description: `${priceText}${savingsText ? ' - ' + savingsText : ''}`,
        images: ['/images/flight-deal-twitter.jpg']
      },
      alternates: {
        canonical: `/shared-alerts/${shareCode}`
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Flight Deal',
      description: 'Check out this flight deal'
    };
  }
}

/**
 * Shared Alert Page
 * @param {Object} props - Page props
 * @returns {JSX.Element} Shared alert page component
 */
export default async function SharedAlertPageWrapper({ params }) {
  try {
    const { shareCode } = params;
    const alertData = await getSharedAlert(shareCode);
    
    if (!alertData) {
      notFound();
    }

    return <SharedAlertPage alertData={alertData} shareCode={shareCode} />;
  } catch (error) {
    console.error('Error loading shared alert:', error);
    notFound();
  }
}