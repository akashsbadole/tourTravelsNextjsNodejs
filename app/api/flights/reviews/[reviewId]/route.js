import { FlightReview } from "@/lib/db/models";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { revalidateTag } from "next/cache";

export async function GET(request, { params }) {
  try {
    const { reviewId } = params;
    
    const review = await FlightReview.findById(reviewId)
      .populate('reviewer', 'name email profileImage')
      .populate('verifiedBy', 'name')
      .populate('airlineResponse.respondedBy', 'name')
      .lean();
    
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: review
    });
    
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { reviewId } = params;
    const body = await request.json();
    
    const review = await FlightReview.findById(reviewId);
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    // Check if user is the review author or admin
    if (review.reviewer.toString() !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }
    
    // Update allowed fields
    const allowedUpdates = [
      'rating', 'comment', 'title', 'pros', 'cons', 'recommendations',
      'categoryRatings', 'tripType', 'travelClass', 'ticketPrice'
    ];
    
    allowedUpdates.forEach(field => {
      if (body[field] !== undefined) {
        review[field] = body[field];
      }
    });
    
    // Update version and edit tracking
    review.version += 1;
    review.editedAt = new Date();
    review.editReason = body.editReason || 'Updated by user';
    
    await review.save();
    
    // Revalidate cache
    revalidateTag(`${review.flightNumber}_review`);
    revalidateTag('flightReviews');
    
    return NextResponse.json({
      success: true,
      data: review
    });
    
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { reviewId } = params;
    
    const review = await FlightReview.findById(reviewId);
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    // Check if user is the review author or admin
    if (review.reviewer.toString() !== session.user.id && !session.user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }
    
    await FlightReview.findByIdAndDelete(reviewId);
    
    // Revalidate cache
    revalidateTag(`${review.flightNumber}_review`);
    revalidateTag('flightReviews');
    
    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}