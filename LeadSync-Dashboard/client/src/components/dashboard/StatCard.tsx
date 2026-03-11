import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-6 relative">
        <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</h3>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
        </div>
        
        <div className="relative z-10">
          <div className="text-3xl font-display font-bold text-foreground">
            {value}
          </div>
          
          {(description || trend) && (
            <div className="mt-2 flex items-center text-sm">
              {trend && (
                <span className={`font-semibold mr-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
                </span>
              )}
              {description && (
                <span className="text-muted-foreground">{description}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
