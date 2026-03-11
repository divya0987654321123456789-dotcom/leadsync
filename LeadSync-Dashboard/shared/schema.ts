import { z } from "zod";

const nullableText = z.string().trim().nullable().optional();
const nullableDateValue = z.union([z.number(), z.string()]).nullable().optional();

export const leadInputSchema = z.object({
  date: nullableDateValue,
  month: nullableText,
  leadSource: nullableText,
  campaignType: nullableText,
  campaignName: nullableText,
  leadStage: nullableText,
  responseType: nullableText,
  actionForSales: nullableText,
  outcome: nullableText,
  leadType: nullableText,
  accountName: nullableText,
  website: nullableText,
  name: nullableText,
  email: nullableText,
  state: nullableText,
  assignTo: nullableText,
});

export const leadResponseSchema = leadInputSchema.extend({
  id: z.number().int(),
  createdAt: z.string().datetime(),
});

export const updateLeadSchema = leadInputSchema.partial();

export type CreateLeadRequest = z.infer<typeof leadInputSchema>;
export type UpdateLeadRequest = z.infer<typeof updateLeadSchema>;
export type LeadResponse = z.infer<typeof leadResponseSchema>;
