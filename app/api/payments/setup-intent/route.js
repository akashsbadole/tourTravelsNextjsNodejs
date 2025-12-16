import { auth } from "@/lib/auth";
import { getUserDetails } from "@/lib/services/user";
import { updateOneDoc } from "@/lib/db/updateOperationDB";
import paymentFactory from "@/lib/payment/factory";
import paymentConfig from "@/lib/payment/config";
import { revalidateTag } from "next/cache";

export async function POST(req) {
  const body = await req.json();
  
  /**
   * @typedef {Object} SetupIntentBody
   * @property {string} idempotencyKey - Idempotency key for the request
   * @property {string} provider - Payment provider (stripe, razorpay, paypal)
   */

  const session = await auth();
  if (!session?.user) {
    return Response.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 },
    );
  }

  try {
    // Initialize payment factory
    await paymentFactory.initialize(paymentConfig.loadConfiguration());
    
    // Get provider based on request or default
    const provider = body.provider 
      ? paymentFactory.getProvider(body.provider)
      : paymentFactory.getProvider();

    const user = await getUserDetails(session.user.id);
    let idempotencyKey = body?.idempotencyKey ?? Date.now().toString();
    
    // Get or create customer ID for the provider
    let customerId = user?.providerCustomerIds?.[provider.getProviderType()] || user?.customerId;
    
    if (!customerId) {
      const customerResult = await provider.createUniqueCustomer(
        {
          name: user.firstName + " " + user.lastName,
          email: user.email,
        },
        ["email"],
      );

      if (!customerResult.success) {
        throw new Error(`Failed to create customer: ${customerResult.error.message}`);
      }

      customerId = customerResult.data.id;
      
      // Update user with new customer ID
      const updateData = {
        [`providerCustomerIds.${provider.getProviderType()}`]: customerId,
      };
      
      // Also update legacy customerId field for backward compatibility
      if (provider.getProviderType() === "stripe") {
        updateData.customerId = customerId;
      }

      await updateOneDoc("User", { _id: user._id }, updateData);
      revalidateTag("userDetails");
    }

    // Create setup intent
    const setupResult = await provider.createSetupIntent(customerId);

    if (!setupResult.success) {
      throw new Error(`Setup intent creation failed: ${setupResult.error.message}`);
    }

    return Response.json(
      {
        success: true,
        message: "Success",
        data: {
          provider: provider.getProviderType(),
          ...setupResult.data,
          customerId,
          idempotencyKey,
          clientConfig: provider.getClientConfig(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.log("Setup intent creation error:", error);
    return Response.json(
      { 
        success: false, 
        message: "Server Error",
        error: error.message 
      },
      { status: 500 },
    );
  }
}