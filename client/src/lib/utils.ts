import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert Excel Serial Date to JS Date string if needed
export function formatExcelDate(excelDate: number | string | null | undefined): string {
  if (!excelDate) return "N/A";
  
  // If it's already a standard string, just return it
  if (typeof excelDate === 'string' && isNaN(Number(excelDate))) {
    return excelDate;
  }

  const numericDate = Number(excelDate);
  if (isNaN(numericDate)) return String(excelDate);

  // Excel Windows epoch starts at Jan 1, 1900.
  // 25569 is the offset in days between 1900-01-01 and 1970-01-01
  const jsDate = new Date(Math.round((numericDate - 25569) * 86400 * 1000));
  
  // Return a readable format
  return jsDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
