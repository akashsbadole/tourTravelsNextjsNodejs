import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getManyDocs, createDoc, updateOneDoc, deleteOneDoc } from "@/lib/db/operations";
import { getAirlinePartnershipAnalytics } from "@/lib/services/airlinePartnershipAnalytics";
import { v4 as uuidv4 } from 'uuid';

/**
 * Admin API endpoint for partnership content management
 * GET: List content or get specific content
 * POST: Create new content
 * PUT: Update content
 * DELETE: Delete content
 */

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    const partnershipId = searchParams.get('partnershipId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';
    const includeVersions = searchParams.get('includeVersions') === 'true';

    if (contentId) {
      // Get specific content
      const content = await getOneDoc("PartnershipContent", { contentId });
      
      if (!content) {
        return NextResponse.json(
          { error: "Content not found" },
          { status: 404 }
        );
      }

      // Include analytics if requested
      let analytics = null;
      if (includeAnalytics) {
        analytics = await getOneDoc("ContentAnalytics", { contentId });
      }

      // Include versions if requested
      let versions = [];
      if (includeVersions) {
        versions = await getManyDocs("ContentVersion", { contentId }, {
          sort: { version: -1 }
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...content,
          analytics,
          versions: includeVersions ? versions.data : []
        },
        meta: {
          contentId,
          includeAnalytics,
          includeVersions,
          retrievedAt: new Date().toISOString()
        }
      });
    } else {
      // List content
      const filters = {};
      if (partnershipId) filters.partnershipId = partnershipId;
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (category) filters.category = category;

      const contentList = await getManyDocs("PartnershipContent", filters, {
        page,
        limit,
        sort: { createdAt: -1 }
      });

      // Get partnership details for each content
      const contentWithPartnerships = await Promise.all(
        contentList.data.map(async (content) => {
          const partnership = await getOneDoc("AirlinePartnership", { 
            partnershipId: content.partnershipId 
          });
          return {
            ...content,
            partnership: partnership ? {
              partnershipId: partnership.partnershipId,
              airlineCode: partnership.airlineCode,
              airlineName: partnership.airlineName,
              tier: partnership.tier
            } : null
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: contentWithPartnerships,
        pagination: {
          page,
          limit,
          total: contentList.total,
          pages: contentList.pages
        },
        meta: {
          filters: Object.keys(filters).length > 0 ? filters : null,
          retrievedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error("Error in content GET:", error);
    return NextResponse.json(
      { 
        error: "Failed to retrieve content",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      partnershipId,
      type,
      title,
      description,
      content,
      category,
      tags = [],
      metadata = {},
      seo = {},
      publishing = {},
      branding = {}
    } = body;

    if (!partnershipId || !type || !title || !content) {
      return NextResponse.json(
        { error: "Partnership ID, type, title, and content are required" },
        { status: 400 }
      );
    }

    // Check if partnership exists
    const partnership = await getOneDoc("AirlinePartnership", { partnershipId });
    if (!partnership) {
      return NextResponse.json(
        { error: "Partnership not found" },
        { status: 404 }
      );
    }

    // Validate content data
    const validation = await validateContentData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: "Validation failed",
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // Create content
    const contentId = uuidv4();
    const contentData = {
      contentId,
      partnershipId,
      type,
      title,
      description,
      content,
      category,
      tags,
      metadata,
      seo: {
        title: seo.title || title,
        description: seo.description || description,
        keywords: seo.keywords || [],
        canonicalUrl: seo.canonicalUrl || null,
        ogImage: seo.ogImage || null,
        ...seo
      },
      publishing: {
        status: publishing.status || 'draft',
        publishedAt: publishing.status === 'published' ? new Date() : null,
        scheduledFor: publishing.scheduledFor || null,
        author: publishing.author || session.user.id,
        reviewer: publishing.reviewer || null,
        reviewedAt: publishing.reviewedAt || null,
        ...publishing
      },
      branding: {
        primaryColor: branding.primaryColor || partnership.branding?.primaryColor || null,
        secondaryColor: branding.secondaryColor || partnership.branding?.secondaryColor || null,
        logo: branding.logo || partnership.branding?.logo || null,
        coBranding: branding.coBranding || false,
        ...branding
      },
      assets: [],
      analytics: {
        views: 0,
        clicks: 0,
        shares: 0,
        conversions: 0,
        engagement: {
          timeOnPage: 0,
          bounceRate: 0,
          scrollDepth: 0
        }
      },
      performance: {
        loadTime: 0,
        score: 0,
        issues: []
      },
      created: {
        by: session.user.id,
        at: new Date()
      },
      updated: {
        by: session.user.id,
        at: new Date()
      }
    };

    const contentRecord = await createDoc("PartnershipContent", contentData);

    // Create initial version
    const versionData = {
      versionId: uuidv4(),
      contentId,
      version: '1.0',
      title,
      description,
      content,
      category,
      tags,
      metadata,
      changes: {
        type: 'initial',
        description: 'Initial content creation',
        sections: ['content', 'metadata']
      },
      created: {
        by: session.user.id,
        at: new Date()
      }
    };

    await createDoc("ContentVersion", versionData);

    // Initialize analytics
    const analyticsData = {
      analyticsId: uuidv4(),
      contentId,
      partnershipId,
      daily: [],
      weekly: [],
      monthly: [],
      total: {
        views: 0,
        clicks: 0,
        shares: 0,
        conversions: 0,
        revenue: 0
      },
      demographics: {},
      sources: {},
      devices: {},
      created: {
        by: session.user.id,
        at: new Date()
      }
    };

    await createDoc("ContentAnalytics", analyticsData);

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('content_created', {
      contentId,
      partnershipId,
      type,
      category,
      createdBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: contentRecord,
      message: "Content created successfully",
      meta: {
        contentId,
        partnershipId,
        createdBy: session.user.id,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in content POST:", error);
    return NextResponse.json(
      { 
        error: "Failed to create content",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { contentId, action, data } = body;

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID is required" },
        { status: 400 }
      );
    }

    // Get existing content
    const content = await getOneDoc("PartnershipContent", { contentId });
    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    let updatedContent = { ...content };

    switch (action) {
      case 'update_content':
        updatedContent = await updateContentContent(content, data, session.user.id);
        break;
      case 'update_seo':
        updatedContent = await updateContentSEO(content, data.seo, session.user.id);
        break;
      case 'update_branding':
        updatedContent = await updateContentBranding(content, data.branding, session.user.id);
        break;
      case 'publish':
        updatedContent = await publishContent(content, data, session.user.id);
        break;
      case 'schedule':
        updatedContent = await scheduleContent(content, data.scheduledFor, session.user.id);
        break;
      case 'unpublish':
        updatedContent = await unpublishContent(content, session.user.id);
        break;
      case 'add_asset':
        updatedContent = await addContentAsset(content, data.asset, session.user.id);
        break;
      case 'remove_asset':
        updatedContent = await removeContentAsset(content, data.assetId, session.user.id);
        break;
      case 'update_analytics':
        updatedContent = await updateContentAnalytics(content, data.analytics, session.user.id);
        break;
      case 'update_performance':
        updatedContent = await updateContentPerformance(content, data.performance, session.user.id);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    // Update the content in database
    await updateOneDoc("PartnershipContent", { contentId }, updatedContent);

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('content_updated', {
      contentId,
      partnershipId: content.partnershipId,
      action,
      updatedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: updatedContent,
      message: `Content ${action} completed successfully`,
      meta: {
        contentId,
        action,
        updatedBy: session.user.id,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in content PUT:", error);
    return NextResponse.json(
      { 
        error: "Failed to update content",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID is required" },
        { status: 400 }
      );
    }

    // Check if content exists
    const content = await getOneDoc("PartnershipContent", { contentId });
    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Check if content can be deleted
    if (content.publishing.status === 'published') {
      return NextResponse.json(
        { error: "Cannot delete published content. Unpublish first." },
        { status: 400 }
      );
    }

    // Delete content and related data
    await deleteOneDoc("PartnershipContent", { contentId });
    await deleteManyDocs("ContentVersion", { contentId });
    await deleteOneDoc("ContentAnalytics", { contentId });

    // Trigger analytics event
    const analyticsService = getAirlinePartnershipAnalytics();
    await analyticsService.triggerAnalyticsEvent('content_deleted', {
      contentId,
      partnershipId: content.partnershipId,
      deletedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: "Content deleted successfully",
      meta: {
        contentId,
        deletedBy: session.user.id,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in content DELETE:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete content",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Validate content data
 * @param {Object} data - Content data
 * @returns {Promise<Object>} Validation result
 */
async function validateContentData(data) {
  const errors = [];

  // Required fields
  const requiredFields = ['partnershipId', 'type', 'title', 'content'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  // Validate content type
  const validTypes = ['landing_page', 'banner', 'email_template', 'blog_post', 'promotion', 'co_branded_page', 'marketing_material'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`Invalid content type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate publishing status
  const validStatuses = ['draft', 'review', 'approved', 'published', 'scheduled', 'archived'];
  if (data.publishing?.status && !validStatuses.includes(data.publishing.status)) {
    errors.push(`Invalid publishing status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate scheduled date
  if (data.publishing?.scheduledFor) {
    const scheduledDate = new Date(data.publishing.scheduledFor);
    if (scheduledDate <= new Date()) {
      errors.push('Scheduled date must be in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Update content and create new version
 * @param {Object} content - Content data
 * @param {Object} contentData - New content data
 * @param {string} userId - User ID
 * @returns {Object} Updated content
 */
async function updateContentContent(content, contentData, userId) {
  const updatedContent = { ...content };
  
  // Create new version
  const newVersion = parseFloat(content.version || '1.0') + 0.1;
  const versionId = uuidv4();
  
  // Update content
  updatedContent.title = contentData.title || updatedContent.title;
  updatedContent.description = contentData.description || updatedContent.description;
  updatedContent.content = contentData.content || updatedContent.content;
  updatedContent.category = contentData.category || updatedContent.category;
  updatedContent.tags = contentData.tags || updatedContent.tags;
  updatedContent.metadata = { ...updatedContent.metadata, ...contentData.metadata };
  updatedContent.version = newVersion.toFixed(1);
  updatedContent.updated = {
    by: userId,
    at: new Date()
  };

  // Create version record
  const versionRecord = {
    versionId,
    contentId: content.contentId,
    version: newVersion.toFixed(1),
    title: updatedContent.title,
    description: updatedContent.description,
    content: updatedContent.content,
    category: updatedContent.category,
    tags: updatedContent.tags,
    metadata: updatedContent.metadata,
    changes: {
      type: 'update',
      description: contentData.changeDescription || 'Content updated',
      sections: Object.keys(contentData).filter(key => ['title', 'description', 'content', 'category', 'tags'].includes(key))
    },
    created: {
      by: userId,
      at: new Date()
    }
  };

  await createDoc("ContentVersion", versionRecord);

  return updatedContent;
}

/**
 * Publish content
 * @param {Object} content - Content data
 * @param {Object} options - Publishing options
 * @param {string} userId - User ID
 * @returns {Object} Updated content
 */
async function publishContent(content, options, userId) {
  const updatedContent = { ...content };
  
  updatedContent.publishing.status = 'published';
  updatedContent.publishing.publishedAt = new Date();
  updatedContent.publishing.reviewer = options.reviewer || userId;
  updatedContent.publishing.reviewedAt = new Date();
  updatedContent.publishing.scheduledFor = null;
  updatedContent.updated = {
    by: userId,
    at: new Date()
  };

  // Generate landing page if applicable
  if (updatedContent.type === 'landing_page') {
    await generateLandingPage(updatedContent);
  }

  // Update SEO metadata
  if (options.seo) {
    updatedContent.seo = { ...updatedContent.seo, ...options.seo };
  }

  return updatedContent;
}

/**
 * Schedule content for publishing
 * @param {Object} content - Content data
 * @param {Date|string} scheduledFor - Schedule date
 * @param {string} userId - User ID
 * @returns {Object} Updated content
 */
async function scheduleContent(content, scheduledFor, userId) {
  const updatedContent = { ...content };
  
  updatedContent.publishing.status = 'scheduled';
  updatedContent.publishing.scheduledFor = new Date(scheduledFor);
  updatedContent.updated = {
    by: userId,
    at: new Date()
  };

  // Add to publishing queue
  await addToPublishingQueue(content.contentId, scheduledFor);

  return updatedContent;
}

/**
 * Add content asset
 * @param {Object} content - Content data
 * @param {Object} asset - Asset data
 * @param {string} userId - User ID
 * @returns {Object} Updated content
 */
async function addContentAsset(content, asset, userId) {
  const updatedContent = { ...content };
  
  const assetData = {
    assetId: uuidv4(),
    type: asset.type,
    name: asset.name,
    description: asset.description || null,
    url: asset.url,
    size: asset.size,
    mimeType: asset.mimeType,
    metadata: asset.metadata || {},
    addedAt: new Date(),
    addedBy: userId
  };

  updatedContent.assets = [...updatedContent.assets, assetData];
  updatedContent.updated = {
    by: userId,
    at: new Date()
  };

  return updatedContent;
}

/**
 * Generate landing page for content
 * @param {Object} content - Content data
 */
async function generateLandingPage(content) {
  // This would typically generate a static or dynamic landing page
  console.log(`Generating landing page for content ${content.contentId}`);
  
  // Generate URL slug
  const slug = generateSlug(content.title);
  const landingPageUrl = `/partnerships/${content.partnershipId}/${slug}`;
  
  // Update content with landing page URL
  await updateOneDoc("PartnershipContent", 
    { contentId: content.contentId }, 
    { 
      'metadata.landingPageUrl': landingPageUrl,
      'metadata.slug': slug
    }
  );
}

/**
 * Generate URL slug from title
 * @param {string} title - Content title
 * @returns {string} URL slug
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Add content to publishing queue
 * @param {string} contentId - Content ID
 * @param {Date} scheduledFor - Schedule date
 */
async function addToPublishingQueue(contentId, scheduledFor) {
  // This would typically add to a job queue
  console.log(`Scheduling content ${contentId} for publishing at ${scheduledFor}`);
}