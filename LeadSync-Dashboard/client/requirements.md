## Packages
@tanstack/react-table | For advanced data table features (sorting, filtering, pagination)
framer-motion | For smooth page transitions and micro-interactions
recharts | For dashboard data visualization
lucide-react | For beautiful standard icons

## Notes
The backend will handle parsing the Excel file via the /api/leads/seed POST endpoint.
Dates in the provided data might be Excel serial numbers (e.g. 46058), we will use a basic formatter in the frontend if needed, but primarily rely on the raw data structure.
Using Shadcn UI Sidebar components for the layout as per documentation.
