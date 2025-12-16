// Travel Agent System Routes Configuration
export const travelRoutes = {
  // User-facing routes
  requirements: {
    base: "/travel-requirements",
    list: "/travel-requirements",
    new: "/travel-requirements/new",
    details: "/travel-requirements/[id]",
    edit: "/travel-requirements/[id]/edit"
  },
  
  // Agent-facing routes
  agent: {
    dashboard: "/agent-dashboard",
    profile: "/agent-profile",
    profileCreate: "/agent-profile/create",
    profileEdit: "/agent-profile/edit"
  },
  
  // Quotation routes
  quotations: {
    list: "/quotations",
    new: "/quotations/new",
    details: "/quotations/[id]",
    edit: "/quotations/[id]/edit",
    respond: "/quotations/[id]/respond"
  },
  
  // Communication routes
  communications: {
    list: "/communications",
    new: "/communications/new",
    details: "/communications/[id]"
  }
};

// Route guards for different user types
export const routeGuards = {
  userOnly: [
    travelRoutes.requirements.base,
    travelRoutes.requirements.new,
    travelRoutes.quotations.list,
    travelRoutes.quotations.new
  ],
  
  agentOnly: [
    travelRoutes.agent.dashboard,
    travelRoutes.agent.profile,
    travelRoutes.agent.profileEdit
  ],
  
  public: [
    travelRoutes.requirements.details,
    travelRoutes.quotations.details
  ]
};

// Navigation items for different user types
export const navigationItems = {
  user: [
    {
      title: "My Requirements",
      href: travelRoutes.requirements.list,
      icon: "📋"
    },
    {
      title: "Create Requirement",
      href: travelRoutes.requirements.new,
      icon: "➕"
    },
    {
      title: "My Quotations",
      href: travelRoutes.quotations.list,
      icon: "💰"
    }
  ],
  
  agent: [
    {
      title: "Dashboard",
      href: travelRoutes.agent.dashboard,
      icon: "📊"
    },
    {
      title: "My Profile",
      href: travelRoutes.agent.profile,
      icon: "👤"
    },
    {
      title: "Requirements",
      href: travelRoutes.requirements.list,
      icon: "📋"
    },
    {
      title: "Create Quotation",
      href: travelRoutes.quotations.new,
      icon: "💰"
    }
  ]
};

// Breadcrumb configurations
export const breadcrumbConfig = {
  [travelRoutes.requirements.list]: {
    title: "Travel Requirements",
    parent: null
  },
  
  [travelRoutes.requirements.new]: {
    title: "Create Requirement",
    parent: {
      title: "Travel Requirements",
      href: travelRoutes.requirements.list
    }
  },
  
  [travelRoutes.requirements.details]: {
    title: "Requirement Details",
    parent: {
      title: "Travel Requirements",
      href: travelRoutes.requirements.list
    }
  },
  
  [travelRoutes.agent.dashboard]: {
    title: "Agent Dashboard",
    parent: null
  },
  
  [travelRoutes.agent.profile]: {
    title: "Agent Profile",
    parent: {
      title: "Dashboard",
      href: travelRoutes.agent.dashboard
    }
  },
  
  [travelRoutes.quotations.details]: {
    title: "Quotation Details",
    parent: {
      title: "My Quotations",
      href: travelRoutes.quotations.list
    }
  }
};