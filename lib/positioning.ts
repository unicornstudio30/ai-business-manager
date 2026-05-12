// Unicorn Studio's positioning — seeded from https://unicorn-studio-ai-website.vercel.app/
// This is the source of truth Claude reads on every command. Editable in /settings.

export const UNICORN = {
  brand: "Unicorn Studio",
  founder: "Saidur Rahaman",
  headline: "AI System Specialists — custom automation, integrations, and AI builds.",
  serviceLines: [
    {
      key: "ai_systems",
      name: "AI Systems",
      what: "Custom automation for business processes, marketing, sales, and communication.",
      pitch: "Replace recurring manual workflows with systems that run themselves.",
    },
    {
      key: "ai_integrations",
      name: "AI Integrations",
      what: "Add AI capabilities to existing products using OpenAI, Claude, Gemini, or custom models.",
      pitch: "Make your existing product 10x more useful by wiring intelligence into the workflows users already do.",
    },
    {
      key: "ai_solutions",
      name: "AI Solutions",
      what: "Custom implementations solving specific business problems.",
      pitch: "Bring us a problem; we build the AI that solves it.",
    },
    {
      key: "ai_saas",
      name: "AI SaaS",
      what: "End-to-end SaaS product development from first commit to full-scale.",
      pitch: "Have an AI product idea? We build it from scratch — design, build, ship.",
    },
    {
      key: "website",
      name: "Website",
      what: "Conversion-focused sites built on WordPress, Webflow, or Framer.",
      pitch: "AI-product founders need sites that convert technical buyers — that's our specialty.",
    },
    {
      key: "branding",
      name: "Branding",
      what: "Logo, visual systems, and messaging for AI products.",
      pitch: "Position your AI product so buyers instantly understand what makes it different.",
    },
  ],
  specializations: [
    "AI Business Process Automation (onboarding, approvals, reporting)",
    "AI Marketing Systems (social, email, content distribution)",
    "AI Sales Systems (qualification, follow-up, pipeline routing)",
    "AI Communication Automation (WhatsApp, Discord, Slack)",
  ],
  icp: [
    "AI SaaS founders (early-stage to growth)",
    "B2B SaaS companies adding AI features",
    "Businesses with manual, repetitive operational processes",
    "Organizations with existing tools needing AI enhancement",
  ],
  pricingModel:
    "Custom scoping before any build. No fixed tiers. 5–8 week typical builds. Today's rate is locked for the lifetime of the engagement. Setup fees exist but are refundable under the guarantee.",
  guarantee:
    "Built and running, or we work free. Full setup-fee refund if scope is missed. Continued free work until system operates as promised. Fixed scope and timeline in writing before builds begin. Client retains all assets permanently.",
  capacityCap: "3–4 new clients per month — capacity is intentionally constrained to maintain quality.",
  process: [
    "Discovery call (30 min, free) — diagnose the workflow / problem",
    "Written scope document with timelines, deliverables, and price",
    "Custom build and maintenance (typical 5–8 weeks)",
  ],
  uniqueValueProps: [
    "Custom-built — we don't pick from a menu.",
    "Deployed to YOUR cloud, accounts, secrets manager — full data privacy.",
    "Every workflow, prompt, integration, and asset stays yours forever.",
    "Guarantee: built and running, or we work free.",
  ],
  competitiveMessaging: [
    "Integrate AI into your business before your competitor does.",
    "The AI gap widens every week — businesses your size are quietly installing AI now.",
  ],
  contact: {
    site: "https://unicorn-studio-ai-website.vercel.app/",
    whatsapp: true,
    email: true,
  },
} as const;

// One-paragraph elevator pitch Claude can use as system context
export const POSITIONING_PROMPT = `
You are drafting on behalf of ${UNICORN.brand} (founded by ${UNICORN.founder}).

Unicorn Studio sells: ${UNICORN.serviceLines.map((s) => s.name).join(" • ")}.

Specializations: ${UNICORN.specializations.join("; ")}.

Ideal client: ${UNICORN.icp.join("; ")}.

Pricing model: ${UNICORN.pricingModel}

Guarantee: ${UNICORN.guarantee}

Capacity: ${UNICORN.capacityCap}

Voice: confident, specific, not salesy. Lead with the prospect's problem, not the offer.
Always use the ACA framework (Acknowledge → Compliment → Ask).
Never pitch in the first message of a sequence — earn the conversation first.
Reference custom-built (not template) work as the differentiator.
`.trim();
