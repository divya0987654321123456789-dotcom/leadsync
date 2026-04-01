import { api, type SalesMapperDemographics } from "@shared/routes";

const ACS_BASE_URL = "https://api.census.gov/data/2024/acs/acs5/profile";
const DISTRICT_GEOMETRY_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?where=1%3D1&outFields=GEOID%2CSTATE%2CCD119%2CNAME&returnGeometry=true&outSR=4326&f=json";

const FIPS_TO_STATE_CODE: Record<string, string> = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
};

type DemographicSnapshot = {
  loadedAt: number;
  payload: SalesMapperDemographics;
};

let demographicsSnapshotCache: DemographicSnapshot | null = null;
let demographicsSnapshotPromise: Promise<DemographicSnapshot> | null = null;

function parseNullableNumber(value: string | null | undefined): number | null {
  if (value == null || value === "" || value === "null" || value === "-666666666") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "IKIO LeadSync Dashboard",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function loadDistrictGeoJson(): Promise<unknown | null> {
  const response = await fetchJson<{
    features?: Array<{
      attributes?: { GEOID?: string; STATE?: string; CD119?: string; NAME?: string };
      geometry?: { rings?: number[][][] };
    }>;
  }>(DISTRICT_GEOMETRY_URL);

  const features = (response.features || [])
    .map((feature) => {
      const stateFips = feature.attributes?.STATE;
      const districtCode = feature.attributes?.CD119;
      const stateCode = stateFips ? FIPS_TO_STATE_CODE[stateFips] : null;
      const rings = feature.geometry?.rings || [];
      if (!stateCode || !feature.attributes?.GEOID || !districtCode || districtCode === "ZZ" || !rings.length) {
        return null;
      }

      // District geometry is only used for line rendering, so each ring can be emitted as its own polygon shell.
      return {
        type: "Feature",
        properties: {
          GEOID: feature.attributes.GEOID,
          STATE: stateFips,
          CD119: districtCode,
          NAME: feature.attributes.NAME || "",
        },
        geometry: {
          type: "MultiPolygon",
          coordinates: rings.map((ring) => [ring]),
        },
      };
    })
    .filter(Boolean);

  return {
    type: "FeatureCollection",
    features,
  };
}

async function loadCountyDemographics(): Promise<SalesMapperDemographics["counties"]> {
  const rows = await fetchJson<string[][]>(`${ACS_BASE_URL}?get=NAME,DP05_0001E,DP03_0062E&for=county:*`);
  const [, ...dataRows] = rows;

  return dataRows
    .map((row) => {
      const [name, population, medianHouseholdIncome, stateFips, countyFips] = row;
      const stateCode = FIPS_TO_STATE_CODE[stateFips];
      if (!stateCode) return null;

      return {
        geoid: `${stateFips}${countyFips}`,
        stateCode,
        stateFips,
        countyFips,
        name,
        population: parseNullableNumber(population),
        medianHouseholdIncome: parseNullableNumber(medianHouseholdIncome),
      };
    })
    .filter((item): item is SalesMapperDemographics["counties"][number] => Boolean(item));
}

async function loadStateDemographics(): Promise<SalesMapperDemographics["states"]> {
  const rows = await fetchJson<string[][]>(`${ACS_BASE_URL}?get=NAME,DP05_0001E,DP03_0062E&for=state:*`);
  const [, ...dataRows] = rows;

  return dataRows
    .map((row) => {
      const [name, population, medianHouseholdIncome, stateFips] = row;
      const stateCode = FIPS_TO_STATE_CODE[stateFips];
      if (!stateCode) return null;

      return {
        stateCode,
        stateFips,
        name,
        population: parseNullableNumber(population),
        medianHouseholdIncome: parseNullableNumber(medianHouseholdIncome),
      };
    })
    .filter((item): item is SalesMapperDemographics["states"][number] => Boolean(item));
}

async function loadDistrictDemographics(): Promise<SalesMapperDemographics["districts"]> {
  const rows = await fetchJson<string[][]>(
    `${ACS_BASE_URL}?get=NAME,DP05_0001E,DP03_0062E&for=congressional%20district:*&in=state:*`,
  );
  const [, ...dataRows] = rows;

  return dataRows
    .map((row) => {
      const [name, population, medianHouseholdIncome, stateFips, districtCode] = row;
      const stateCode = FIPS_TO_STATE_CODE[stateFips];
      if (!stateCode) return null;

      return {
        geoid: `${stateFips}${districtCode}`,
        stateCode,
        stateFips,
        districtCode,
        name,
        population: parseNullableNumber(population),
        medianHouseholdIncome: parseNullableNumber(medianHouseholdIncome),
      };
    })
    .filter((item): item is SalesMapperDemographics["districts"][number] => Boolean(item));
}

async function buildDemographicsSnapshot(): Promise<DemographicSnapshot> {
  const [states, counties, districts, districtGeoJson] = await Promise.all([
    loadStateDemographics(),
    loadCountyDemographics(),
    loadDistrictDemographics(),
    loadDistrictGeoJson().catch((error) => {
      console.warn("District geometry load skipped:", error);
      return null;
    }),
  ]);

  return {
    loadedAt: Date.now(),
    payload: api.dashboard.salesMapperDemographics.responses[200].parse({
      generatedAt: new Date().toISOString(),
      states,
      counties,
      districts,
      districtGeoJson,
    }),
  };
}

function shouldReuseSnapshot(snapshot: DemographicSnapshot): boolean {
  return Date.now() - snapshot.loadedAt < 24 * 60 * 60 * 1000;
}

async function getDemographicsSnapshot(): Promise<DemographicSnapshot> {
  if (demographicsSnapshotCache && shouldReuseSnapshot(demographicsSnapshotCache)) {
    return demographicsSnapshotCache;
  }

  if (!demographicsSnapshotPromise) {
    demographicsSnapshotPromise = buildDemographicsSnapshot()
      .then((snapshot) => {
        demographicsSnapshotCache = snapshot;
        return snapshot;
      })
      .finally(() => {
        demographicsSnapshotPromise = null;
      });
  }

  return demographicsSnapshotPromise;
}

export async function getSalesMapperDemographics(): Promise<SalesMapperDemographics> {
  const snapshot = await getDemographicsSnapshot();
  return snapshot.payload;
}
