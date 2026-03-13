import type { Express } from "express";
import type { Server } from "http";
import { storage, LeadNotFoundError } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { getWorkbookDashboard, type DashboardFilters } from "./onedrive-workbook";
import { getSalesMapperData } from "./sales-mapper";
import { authenticateUser, destroySession, establishSession, getSessionUser, requireAuth } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get(api.auth.session.path, (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    return res.json(user);
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = authenticateUser(input.email, input.password);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await establishSession(req, user);
      return res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }

      return res.status(500).json({ message: "Failed to sign in" });
    }
  });

  app.post(api.auth.logout.path, async (req, res) => {
    await destroySession(req);
    res.status(204).end();
  });

  app.get(api.dashboard.workbook.path, requireAuth, async (_req, res) => {
    try {
      const req = _req;
      const filters: DashboardFilters = {
        sheet: typeof req.query.sheet === "string" ? req.query.sheet : undefined,
        campaignType: typeof req.query.campaignType === "string" ? req.query.campaignType : undefined,
        segment: typeof req.query.segment === "string" ? req.query.segment : undefined,
        year: typeof req.query.year === "string" ? req.query.year : undefined,
        quarter: typeof req.query.quarter === "string" ? req.query.quarter : undefined,
        month: typeof req.query.month === "string" ? req.query.month : undefined,
        state: typeof req.query.state === "string" ? req.query.state : undefined,
        responseType: typeof req.query.responseType === "string" ? req.query.responseType : undefined,
      };
      const dashboard = await getWorkbookDashboard(filters);
      res.json(dashboard);
    } catch (err: any) {
      console.error("Workbook sync error:", err);
      res.status(500).json({ message: `Failed to fetch workbook: ${err.message}` });
    }
  });

  app.get(api.dashboard.salesMapper.path, requireAuth, async (_req, res) => {
    try {
      const salesMapper = await getSalesMapperData();
      res.json(salesMapper);
    } catch (err: any) {
      console.error("Projects load error:", err);
      res.status(500).json({ message: `Failed to fetch Projects: ${err.message}` });
    }
  });

  app.get(api.leads.list.path, requireAuth, async (req, res) => {
    try {
      const sheetName = typeof req.query.sheet === "string" ? req.query.sheet : undefined;
      const leads = await storage.getLeads(sheetName);
      res.json(leads);
    } catch {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get(api.leads.get.path, requireAuth, async (req, res) => {
    try {
      const sheetName = typeof req.query.sheet === "string" ? req.query.sheet : undefined;
      const lead = await storage.getLead(Number(req.params.id), sheetName);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch {
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post(api.leads.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.leads.create.input.parse(req.body);
      const lead = await storage.createLead(input);
      res.status(201).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.put(api.leads.update.path, requireAuth, async (req, res) => {
    try {
      const input = api.leads.update.input.parse(req.body);
      const lead = await storage.updateLead(Number(req.params.id), input);
      res.json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      if (err instanceof LeadNotFoundError) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete(api.leads.delete.path, requireAuth, async (req, res) => {
    try {
      await storage.deleteLead(Number(req.params.id));
      res.status(204).end();
    } catch (err) {
      if (err instanceof LeadNotFoundError) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  return httpServer;
}

