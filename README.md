# IKIO Dashboard Suite

Static React dashboard with two views:

- `Lead Sync` reads the shared Excel workbook from OneDrive/SharePoint at runtime.
- `Sales Mapper` reads a generated local JSON file built from the IKIO project CSV.

## Files

- `index.html` is the entry point.
- `app.js` contains the React dashboard.
- `styles.css` contains the UI styling.
- `app.js` fetches the shared workbook, summarizes it in-browser, and refreshes automatically.
- `export_sales_mapper_data.py` converts the provided project CSV into `data/sales-mapper-data.json`.
- `export_dashboard_data.py` is the older local export utility and is no longer required for the live dashboard flow.

## Live data source

The dashboard is wired to this shared workbook URL:

`https://ikioledlighting99-my.sharepoint.com/:x:/g/personal/dlalwani_ikioledlighting_com/IQCsKfOLIu9-SbAW-Je4YYHJAWBbex7KRI_Myyv6cMYddI4?e=06qHCR`

At runtime the page requests the workbook download URL, rebuilds the summary metrics in the browser, and polls for changes every 5 minutes.

If the Excel file is updated in OneDrive/SharePoint, the dashboard will pick up the new values on the next refresh cycle or page reload.

## Sales mapper data source

The sales mapper page is generated from:

`Lead-Sync-Dashboard/Lead-Sync-Dashboard/IKIO_Final_With_Zip_And_Product_Category.csv`

Regenerate the mapper dataset after CSV changes:

```powershell
python export_sales_mapper_data.py
```

## Preview locally

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy

Upload the repository contents to any static host such as Netlify, Vercel, GitHub Pages, Cloudflare Pages, or an S3-style static website bucket.
