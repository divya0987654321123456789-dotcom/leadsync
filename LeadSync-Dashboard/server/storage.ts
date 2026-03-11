import type {
  CreateLeadRequest,
  LeadResponse,
  UpdateLeadRequest,
} from "@shared/schema";
import { getLeadRowsFromWorkbook } from "./onedrive-workbook";

type WorkbookInitResult = {
  count: number;
  created: boolean;
  workbookPath: string;
};

export class LeadNotFoundError extends Error {
  constructor(id: number) {
    super(`Lead ${id} not found`);
    this.name = "LeadNotFoundError";
  }
}

export interface IStorage {
  getLeads(sheetName?: string): Promise<LeadResponse[]>;
  getLead(id: number, sheetName?: string): Promise<LeadResponse | undefined>;
  createLead(_lead: CreateLeadRequest): Promise<LeadResponse>;
  updateLead(id: number, _updates: UpdateLeadRequest): Promise<LeadResponse>;
  deleteLead(id: number): Promise<void>;
  createManyLeads(_leadsData: CreateLeadRequest[]): Promise<number>;
  ensureWorkbook(): Promise<WorkbookInitResult>;
}

function readOnlyError(): never {
  throw new Error("The workbook source is configured as a synced read-only source.");
}

export class OneDriveStorage implements IStorage {
  async ensureWorkbook(): Promise<WorkbookInitResult> {
    const leads = await this.getLeads();
    return {
      count: leads.length,
      created: false,
      workbookPath: "Workbook source",
    };
  }

  async getLeads(sheetName?: string): Promise<LeadResponse[]> {
    return getLeadRowsFromWorkbook(sheetName || process.env.LEADS_SHEET_NAME || "2026 Leads");
  }

  async getLead(id: number, sheetName?: string): Promise<LeadResponse | undefined> {
    const leads = await this.getLeads(sheetName);
    return leads.find((lead) => lead.id === id);
  }

  async createLead(_lead: CreateLeadRequest): Promise<LeadResponse> {
    return readOnlyError();
  }

  async updateLead(id: number, _updates: UpdateLeadRequest): Promise<LeadResponse> {
    const lead = await this.getLead(id);
    if (!lead) throw new LeadNotFoundError(id);
    return readOnlyError();
  }

  async deleteLead(id: number): Promise<void> {
    const lead = await this.getLead(id);
    if (!lead) throw new LeadNotFoundError(id);
    return readOnlyError();
  }

  async createManyLeads(_leadsData: CreateLeadRequest[]): Promise<number> {
    return readOnlyError();
  }
}

export const storage = new OneDriveStorage();
