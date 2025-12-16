import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import analyticsPerformanceService from "@/lib/services/analyticsPerformance";

/**
 * POST /api/analytics/performance
 * Run analytics performance optimization tasks
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admin users or system calls
    if (!session && !request.headers.get('x-system-call')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { task } = await request.json();

    let result;

    switch (task) {
      case 'processBatchEvents':
        result = await analyticsPerformanceService.processBatchEvents();
        break;
      case 'cleanupOldData':
        const { retentionDays } = await request.json();
        result = await analyticsPerformanceService.cleanupOldData(retentionDays);
        break;
      case 'optimizeIndexes':
        result = await analyticsPerformanceService.optimizeIndexes();
        break;
      case 'generateReport':
        result = await analyticsPerformanceService.generatePerformanceReport();
        break;
      default:
        // Run all tasks
        result = {
          batchProcessing: await analyticsPerformanceService.processBatchEvents(),
          cleanup: await analyticsPerformanceService.cleanupOldData(),
          optimization: await analyticsPerformanceService.optimizeIndexes(),
          report: await analyticsPerformanceService.generatePerformanceReport()
        };
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error running performance task:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run performance task" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/performance
 * Get performance metrics
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow admin users
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await analyticsPerformanceService.generatePerformanceReport();

    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error("Error getting performance metrics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get performance metrics" },
      { status: 500 }
    );
  }
}