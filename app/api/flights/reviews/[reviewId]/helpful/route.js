import { FlightReview } from "@/lib/db/models";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { reviewId } = params;
    const { voteType } = await request.json(); // 'helpful' or 'not_helpful'
    
    if (!['helpful', 'not_helpful'].includes(voteType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vote type' },
        { status: 400 }
      );
    }
    
    const review = await FlightReview.findById(reviewId);
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    const userId = session.user.id;
    
    // Remove user from both arrays first
    review.helpfulVotes = review.helpfulVotes.filter(id => id.toString() !== userId);
    review.notHelpfulVotes = review.notHelpfulVotes.filter(id => id.toString() !== userId);
    
    // Add to appropriate array
    if (voteType === 'helpful') {
      review.helpfulVotes.push(userId);
    } else {
      review.notHelpfulVotes.push(userId);
    }
    
    await review.save();
    
    // Calculate new helpfulness score
    const totalVotes = review.helpfulVotes.length + review.notHelpfulVotes.length;
    const helpfulnessScore = totalVotes > 0 ? (review.helpfulVotes.length / totalVotes) * 100 : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        helpfulVotes: review.helpfulVotes.length,
        notHelpfulVotes: review.notHelpfulVotes.length,
        helpfulnessScore
      }
    });
    
  } catch (error) {
    console.error('Error voting on review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to vote on review' },
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
    const userId = session.user.id;
    
    const review = await FlightReview.findById(reviewId);
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    // Remove user from both arrays
    review.helpfulVotes = review.helpfulVotes.filter(id => id.toString() !== userId);
    review.notHelpfulVotes = review.notHelpfulVotes.filter(id => id.toString() !== userId);
    
    await review.save();
    
    return NextResponse.json({
      success: true,
      data: {
        helpfulVotes: review.helpfulVotes.length,
        notHelpfulVotes: review.notHelpfulVotes.length,
        helpfulnessScore: 0
      }
    });
    
  } catch (error) {
    console.error('Error removing vote from review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove vote' },
      { status: 500 }
    );
  }
}