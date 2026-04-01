import { z } from "zod";
import {
  leadInputSchema,
  leadResponseSchema,
  type CreateLeadRequest,
  type LeadResponse,
  updateLeadSchema,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const countItemSchema = z.object({
  label: z.string(),
  value: z.number(),
});

const monthItemSchema = z.object({
  month: z.string(),
  value: z.number(),
});

const recentLeadSchema = z.object({
  date: z.union([z.string(), z.number()]).nullable(),
  account: z.string(),
  campaign: z.string(),
  stage: z.string(),
  owner: z.string(),
  state: z.string(),
  outcome: z.string().nullable(),
});

const filterOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const dashboardSheetOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  sheetType: z.enum(["all", "leads", "email"]),
  year: z.string().nullable(),
});

const dashboardMonthlyItemSchema = z.object({
  month: z.string(),
  label: z.string(),
  emailSent: z.number(),
  responses: z.number(),
});

const dashboardAgencyItemSchema = z.object({
  label: z.string(),
  emailSent: z.number(),
  responses: z.number(),
});

const dashboardTableRowSchema = z.object({
  id: z.string(),
  month: z.string(),
  leadStage: z.string(),
  responseType: z.string(),
  state: z.string(),
  accountName: z.string(),
  assignTo: z.string(),
  outcome: z.string().nullable(),
  actionForSales: z.string().nullable(),
  date: z.union([z.string(), z.number()]).nullable(),
});

const dashboardMapStateSchema = z.object({
  code: z.string(),
  value: z.number(),
});

const salesMapperSummarySchema = z.object({
  projectCount: z.number(),
  mappedProjectCount: z.number(),
  coveredStateCount: z.number(),
  productCategoryCount: z.number(),
  annualEnergySavingsKwh: z.number(),
  annualCostSavingsUsd: z.number(),
  maintenanceSavingsUsd: z.number(),
});

const salesMapperFilterOptionsSchema = z.object({
  statesWithProjects: z.array(z.string()),
  productCategories: z.array(z.string()),
  projectTypes: z.array(z.string()),
});

const salesMapperProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  stateCode: z.string().nullable(),
  zip: z.string().nullable(),
  projectType: z.string().nullable(),
  productsUsed: z.string().nullable(),
  productCategory: z.string().nullable(),
  annualEnergySavingsKwh: z.number().nullable(),
  annualCostSavingsUsd: z.number().nullable(),
  fixturesCommissioned: z.number().nullable(),
  improvedLightingPercent: z.number().nullable(),
  maintenanceSavingsUsd: z.number().nullable(),
  images: z.array(z.string()).nullable(),
  projectSummary: z.string().nullable().optional(),
  projectTimeline: z.string().nullable().optional(),
  subcontractorInfo: z.string().nullable().optional(),
  salesQuote: z.string().nullable().optional(),
  associatedPerson: z.string().nullable().optional(),
  description: z.string().nullable(),
  challenge: z.string().nullable(),
  resolution: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

const salesMapperSchema = z.object({
  generatedAt: z.string(),
  sourcePath: z.string(),
  defaultState: z.string(),
  summary: salesMapperSummarySchema,
  filterOptions: salesMapperFilterOptionsSchema,
  projects: z.array(salesMapperProjectSchema),
});

const salesMapperDemographicStateSchema = z.object({
  stateCode: z.string(),
  stateFips: z.string(),
  name: z.string(),
  population: z.number().nullable(),
  medianHouseholdIncome: z.number().nullable(),
});

const salesMapperDemographicCountySchema = z.object({
  geoid: z.string(),
  stateCode: z.string(),
  stateFips: z.string(),
  countyFips: z.string(),
  name: z.string(),
  population: z.number().nullable(),
  medianHouseholdIncome: z.number().nullable(),
});

const salesMapperDemographicDistrictSchema = z.object({
  geoid: z.string(),
  stateCode: z.string(),
  stateFips: z.string(),
  districtCode: z.string(),
  name: z.string(),
  population: z.number().nullable(),
  medianHouseholdIncome: z.number().nullable(),
});

const salesMapperDemographicsSchema = z.object({
  generatedAt: z.string(),
  states: z.array(salesMapperDemographicStateSchema),
  counties: z.array(salesMapperDemographicCountySchema),
  districts: z.array(salesMapperDemographicDistrictSchema),
  districtGeoJson: z.any().nullable(),
});

const baseSheetSummarySchema = z.object({
  sheetName: z.string(),
  sheetType: z.enum(["leads", "email"]),
  totalRows: z.number(),
  uniqueAccounts: z.number(),
  uniqueContacts: z.number(),
  uniqueCampaigns: z.number(),
  uniqueStates: z.number(),
  uniqueOwners: z.number(),
  latestActivityDate: z.union([z.string(), z.number()]).nullable(),
  byMonth: z.array(monthItemSchema),
  byStage: z.array(countItemSchema),
  byLeadType: z.array(countItemSchema),
  byState: z.array(countItemSchema),
  byOwner: z.array(countItemSchema),
  byCampaignType: z.array(countItemSchema),
  byCampaign: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      stages: z.array(countItemSchema).optional(),
    }),
  ),
});

const leadSheetSummarySchema = baseSheetSummarySchema.extend({
  sheetType: z.literal("leads"),
  positiveCount: z.number(),
  negativeCount: z.number(),
  followUpCount: z.number(),
  positiveRate: z.number(),
  negativeRate: z.number(),
  followUpRate: z.number(),
  bySource: z.array(countItemSchema),
  byResponseType: z.array(countItemSchema),
  recentLeads: z.array(recentLeadSchema),
});

const emailSheetSummarySchema = baseSheetSummarySchema.extend({
  sheetType: z.literal("email"),
  deliveredCount: z.number(),
  openedCount: z.number(),
  repliedCount: z.number(),
  bouncedCount: z.number(),
  deliveredRate: z.number(),
  openRate: z.number(),
  replyRate: z.number(),
  bounceRate: z.number(),
});

const authUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  provider: z.enum(["basic", "company"]),
  role: z.enum(["admin", "member"]),
});

const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const workbookDashboardSchema = z.object({
  sourceUrl: z.string(),
  syncedAt: z.string().datetime(),
  sheetOrder: z.array(z.string()),
  sheets: z.record(z.union([leadSheetSummarySchema, emailSheetSummarySchema])),
  sheetOptions: z.array(dashboardSheetOptionSchema),
  filterOptions: z.object({
    campaignTypes: z.array(filterOptionSchema),
    segments: z.array(filterOptionSchema),
    years: z.array(filterOptionSchema),
    quarters: z.array(filterOptionSchema),
    months: z.array(filterOptionSchema),
    states: z.array(filterOptionSchema),
    responseTypes: z.array(filterOptionSchema),
  }),
  filtersApplied: z.object({
    sheet: z.string(),
    campaignType: z.string(),
    segment: z.string(),
    year: z.string(),
    quarter: z.string(),
    month: z.string(),
    state: z.string(),
    responseType: z.string(),
  }),
  metrics: z.object({
    quoted: z.number().nullable(),
    revenue: z.number().nullable(),
    emailSent: z.number(),
    responses: z.number(),
  }),
  charts: z.object({
    monthlyResponse: z.array(dashboardMonthlyItemSchema),
    agencyResponse: z.array(dashboardAgencyItemSchema),
    targetEmailSent: z.array(countItemSchema),
    conversionRatio: z.array(countItemSchema),
  }),
  tableRows: z.array(dashboardTableRowSchema),
  mapStates: z.array(dashboardMapStateSchema),
});

export const api = {
  auth: {
    session: {
      method: "GET" as const,
      path: "/api/auth/session" as const,
      responses: {
        200: authUserSchema,
        401: errorSchemas.unauthorized,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      input: authLoginSchema,
      responses: {
        200: authUserSchema,
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
      responses: {
        204: z.void(),
      },
    },
  },
  dashboard: {
    workbook: {
      method: "GET" as const,
      path: "/api/dashboard/workbook" as const,
      responses: {
        200: workbookDashboardSchema,
      },
    },
    salesMapper: {
      method: "GET" as const,
      path: "/api/dashboard/sales-mapper" as const,
      responses: {
        200: salesMapperSchema,
      },
    },
    salesMapperDemographics: {
      method: "GET" as const,
      path: "/api/dashboard/sales-mapper-demographics" as const,
      responses: {
        200: salesMapperDemographicsSchema,
      },
    },
  },
  leads: {
    list: {
      method: "GET" as const,
      path: "/api/leads" as const,
      responses: {
        200: z.array(leadResponseSchema),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/leads/:id" as const,
      responses: {
        200: leadResponseSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/leads" as const,
      input: leadInputSchema,
      responses: {
        201: leadResponseSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/leads/:id" as const,
      input: updateLeadSchema,
      responses: {
        200: leadResponseSchema,
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/leads/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type LeadInput = CreateLeadRequest;
export type LeadUpdateInput = z.infer<typeof api.leads.update.input>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type SalesMapperData = z.infer<typeof salesMapperSchema>;
export type SalesMapperDemographics = z.infer<typeof salesMapperDemographicsSchema>;
export type { LeadResponse };
