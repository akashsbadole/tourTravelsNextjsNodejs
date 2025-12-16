import { NextResponse } from "next/server";
import paymentFactory from "@/lib/payment/factory";
import paymentConfig from "@/lib/payment/config";

export async function GET() {
  try {
    // Initialize payment factory
    await paymentFactory.initialize(paymentConfig.loadConfiguration());
    
    // Get frontend configuration
    const config = paymentFactory.getFrontendConfig();
    const supportedMethods = await paymentFactory.getAllSupportedPaymentMethods();
    
    return NextResponse.json({
      success: true,
      data: {
        ...config,
        supportedPaymentMethods: supportedMethods,
        currencyConfig: paymentConfig.getCurrencyConfig(),
        features: paymentConfig.getFrontendConfig().features,
      },
    });
  } catch (error) {
    console.error("Payment config error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to get payment configuration",
        error: error.message 
      },
      { status: 500 }
    );
  }
}