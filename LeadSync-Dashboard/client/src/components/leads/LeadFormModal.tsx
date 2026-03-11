import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, type LeadInput, type LeadUpdateInput, type LeadResponse } from "@shared/routes";
import { useCreateLead, useUpdateLead } from "@/hooks/use-leads";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadResponse | null;
}

export function LeadFormModal({ open, onOpenChange, lead }: LeadFormModalProps) {
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEdit = !!lead;

  const form = useForm<LeadInput>({
    resolver: zodResolver(api.leads.create.input),
    defaultValues: {
      date: undefined,
      month: "",
      leadSource: "",
      campaignType: "",
      campaignName: "",
      leadStage: "New",
      responseType: "",
      actionForSales: "",
      outcome: "",
      leadType: "",
      accountName: "",
      website: "",
      name: "",
      email: "",
      state: "",
      assignTo: "",
    },
  });

  useEffect(() => {
    if (open && lead) {
      form.reset({
        date: lead.date ?? undefined,
        month: lead.month ?? "",
        leadSource: lead.leadSource ?? "",
        campaignType: lead.campaignType ?? "",
        campaignName: lead.campaignName ?? "",
        leadStage: lead.leadStage ?? "New",
        responseType: lead.responseType ?? "",
        actionForSales: lead.actionForSales ?? "",
        outcome: lead.outcome ?? "",
        leadType: lead.leadType ?? "",
        accountName: lead.accountName ?? "",
        website: lead.website ?? "",
        name: lead.name ?? "",
        email: lead.email ?? "",
        state: lead.state ?? "",
        assignTo: lead.assignTo ?? "",
      });
    } else if (open && !lead) {
      form.reset({
        date: undefined,
        month: "",
        leadSource: "",
        campaignType: "",
        campaignName: "",
        leadStage: "New",
        responseType: "",
        actionForSales: "",
        outcome: "",
        leadType: "",
        accountName: "",
        website: "",
        name: "",
        email: "",
        state: "",
        assignTo: "",
      });
    }
  }, [open, lead, form]);

  const onSubmit = (data: LeadInput) => {
    if (isEdit && lead) {
      updateMutation.mutate(
        { id: lead.id, ...data },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? "Edit Lead" : "Create New Lead"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account / Organization</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Stage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Under/ Follow-up">Under/ Follow-up</SelectItem>
                        <SelectItem value="Qualified">Qualified</SelectItem>
                        <SelectItem value="Not Interested">Not Interested</SelectItem>
                        <SelectItem value="Closed Won">Closed Won</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Response Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select response" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Positive">Positive</SelectItem>
                        <SelectItem value="Neutral">Neutral</SelectItem>
                        <SelectItem value="Negative">Negative</SelectItem>
                        <SelectItem value="No Response">No Response</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Government, School" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="campaignName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="EECBG Indiana 2026" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <Input placeholder="Sales rep name" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome / Notes</FormLabel>
                  <FormControl>
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Latest update or conversation summary..." 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
