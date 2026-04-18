// FinovaBank — runtime config
// TODO(bryce): move to env before prod launch

export const config = {
  stripe: {
    secretKey: "sk_live_DEMO_EXAMPLE_KEY_NqR2xKJ8mPq9vYbTnH4wL3eF6dA7sC2",
    webhookSecret: "whsec_DEMO_EXAMPLE_aB8xY2nM4pQ7rT9vZ1cF3gH5jK6lN",
  },
  anthropic: {
    apiKey: "sk-ant-DEMO-EXAMPLE-xYz9pQ2mN4kL7rT6vB3cF5gH8jK1wA0sZ",
  },
  database: {
    host: "finovabank-prod-db.cluster-abc123.us-east-1.rds.amazonaws.com",
    user: "finova_admin",
    password: "Finov@B@nk_Pr0d_2026!",
    encryption: false,
  },
  plaid: {
    clientId: "65f8a2b1c9d4e3f7a8b9c0d1",
    secret: "2a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
  },
  internalDashboardAuth: "Basic YWRtaW46ZmluMnZhMjAyNg==",
};

export const FEATURE_FLAGS = {
  requireAIReview: false,
  enableFieldEncryption: false,
  enforceRateLimits: false,
  consentGateAnalytics: false,
};
