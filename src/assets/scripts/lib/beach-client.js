import { normalizeText } from './formatters.js';

const MANIFEST_URL = '/assets/data/beaches.json';

const STATUS_ENDPOINT = 'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/Swimming_beaches_view/FeatureServer/0/query';
const TEMPERATURE_ENDPOINT = 'https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/Swim_beach_temperature_view/FeatureServer/0/query';

const STATUS_PARAMS = {
  where: '1=1',
  outFields: 'siteID,locator,siteName,city,Water_Body,Google_Maps,Beach_Status,Beach_Has_Current_Data,Reason_For_Closure,Closure_Explanation_For_Web',
  returnGeometry: 'false',
  orderByFields: 'siteName',
  f: 'json'
};

const TEMPERATURE_PARAMS = {
  where: '1=1',
  outFields: 'siteID,locator,siteName,WaterTempF,SampleTimestamp,Geomean30d,nSamplesHigh30d',
  returnGeometry: 'false',
  orderByFields: 'siteName',
  f: 'json'
};

const cache = {
  manifest: null,
  statusDataset: null,
  temperatureDataset: null,
  statusIndex: null,
  temperatureIndex: null
};

function buildUrl(endpoint, params) {
  const url = new URL(endpoint, window.location.origin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (payload?.error) {
    throw new Error(payload.error.message || 'Remote service returned an error');
  }

  return payload;
}

function joinKey(type, value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (type === 'site') {
    return `${type}:${value}`;
  }

  return `${type}:${normalizeText(value)}`;
}

function getRecordKeys(record) {
  const keys = [];

  if (Number.isInteger(record.siteID)) {
    keys.push(joinKey('site', record.siteID));
  }

  if (record.locator) {
    keys.push(joinKey('locator', record.locator));
  }

  if (record.siteName) {
    keys.push(joinKey('name', record.siteName));
  }

  return keys.filter(Boolean);
}

function getBeachKeys(beach) {
  const keys = [];

  if (Number.isInteger(beach.siteID)) {
    keys.push(joinKey('site', beach.siteID));
  }

  if (beach.locator) {
    keys.push(joinKey('locator', beach.locator));
  }

  if (beach.joinName) {
    keys.push(joinKey('name', beach.joinName));
  }

  return keys.filter(Boolean);
}

function normalizeBeach(beach) {
  return {
    ...beach,
    aliases: Array.isArray(beach.aliases) ? beach.aliases : []
  };
}

function normalizeStatusRecord(attributes) {
  return {
    siteID: Number.isInteger(attributes.siteID) ? attributes.siteID : null,
    locator: attributes.locator || null,
    siteName: attributes.siteName || null,
    city: attributes.city || null,
    waterBody: attributes.Water_Body || null,
    mapsUrl: attributes.Google_Maps || null,
    officialStatus: attributes.Beach_Status || 'Unavailable',
    hasCurrentCountyData: attributes.Beach_Has_Current_Data === 'True',
    reasonForClosure: attributes.Reason_For_Closure || null,
    closureExplanation: attributes.Closure_Explanation_For_Web || null
  };
}

function normalizeTemperatureRecord(attributes) {
  return {
    siteID: Number.isInteger(attributes.siteID) ? attributes.siteID : null,
    locator: attributes.locator || null,
    siteName: attributes.siteName || null,
    waterTempF: Number.isFinite(attributes.WaterTempF) ? attributes.WaterTempF : null,
    sampleTimestamp: Number.isFinite(attributes.SampleTimestamp) ? attributes.SampleTimestamp : null,
    bacteria30dGeomean: Number.isFinite(attributes.Geomean30d) ? attributes.Geomean30d : null,
    highSamples30d: Number.isFinite(attributes.nSamplesHigh30d) ? attributes.nSamplesHigh30d : null
  };
}

function shouldReplaceTemperatureRecord(current, candidate) {
  const currentTimestamp = current.sampleTimestamp ?? -1;
  const candidateTimestamp = candidate.sampleTimestamp ?? -1;

  if (candidateTimestamp !== currentTimestamp) {
    return candidateTimestamp > currentTimestamp;
  }

  const currentScore = Number(current.waterTempF !== null) + Number(current.bacteria30dGeomean !== null);
  const candidateScore = Number(candidate.waterTempF !== null) + Number(candidate.bacteria30dGeomean !== null);

  return candidateScore > currentScore;
}

function buildIndex(records, replaceFn) {
  const index = new Map();

  for (const record of records) {
    for (const key of getRecordKeys(record)) {
      const existing = index.get(key);

      if (!existing || replaceFn(existing, record)) {
        index.set(key, record);
      }
    }
  }

  return index;
}

async function loadManifest(options = {}) {
  if (options.force || !cache.manifest) {
    cache.manifest = fetchJson(MANIFEST_URL).then((records) => {
      if (!Array.isArray(records)) {
        throw new Error('Beach manifest did not return an array');
      }

      return records
        .map(normalizeBeach)
        .sort((left, right) => left.displayOrder - right.displayOrder);
    });
  }

  return cache.manifest;
}

async function loadStatusDataset(options = {}) {
  if (options.force || !cache.statusDataset) {
    cache.statusDataset = fetchJson(buildUrl(STATUS_ENDPOINT, STATUS_PARAMS)).then((payload) => {
      const records = Array.isArray(payload.features)
        ? payload.features.map((feature) => normalizeStatusRecord(feature.attributes))
        : [];

      cache.statusIndex = buildIndex(records, () => false);

      return records;
    });
  }

  return cache.statusDataset;
}

async function loadTemperatureDataset(options = {}) {
  if (options.force || !cache.temperatureDataset) {
    cache.temperatureDataset = fetchJson(buildUrl(TEMPERATURE_ENDPOINT, TEMPERATURE_PARAMS)).then((payload) => {
      const records = Array.isArray(payload.features)
        ? payload.features.map((feature) => normalizeTemperatureRecord(feature.attributes))
        : [];

      cache.temperatureIndex = buildIndex(records, shouldReplaceTemperatureRecord);

      return records;
    });
  }

  return cache.temperatureDataset;
}

async function ensureStatusIndex(options = {}) {
  if (options.force || !cache.statusIndex) {
    await loadStatusDataset(options);
  }

  return cache.statusIndex;
}

async function ensureTemperatureIndex(options = {}) {
  if (options.force || !cache.temperatureIndex) {
    await loadTemperatureDataset(options);
  }

  return cache.temperatureIndex;
}

async function getBeachById(beachId, options = {}) {
  const beaches = await loadManifest(options);
  const beach = beaches.find((entry) => entry.id === beachId);

  if (!beach) {
    throw new Error(`Unknown beach id: ${beachId}`);
  }

  return beach;
}

function resolveRecord(index, beach) {
  for (const key of getBeachKeys(beach)) {
    if (index.has(key)) {
      return index.get(key);
    }
  }

  return null;
}

async function getBeachStatus(beachId, options = {}) {
  const [beach, index] = await Promise.all([
    getBeachById(beachId, options),
    ensureStatusIndex(options)
  ]);

  const record = resolveRecord(index, beach);

  return {
    beachId: beach.id,
    siteName: beach.siteName,
    city: beach.city,
    waterBody: beach.waterBody,
    mapsUrl: beach.mapsUrl,
    hasSourceRecord: Boolean(record),
    officialStatus: record?.officialStatus || 'Unavailable',
    hasCurrentCountyData: Boolean(record?.hasCurrentCountyData),
    hasRecentData: Boolean(record && record.officialStatus !== 'No recent data'),
    reasonForClosure: record?.reasonForClosure || null,
    closureExplanation: record?.closureExplanation || null
  };
}

async function getBeachTemperature(beachId, options = {}) {
  const [beach, index] = await Promise.all([
    getBeachById(beachId, options),
    ensureTemperatureIndex(options)
  ]);

  const record = resolveRecord(index, beach);

  return {
    beachId: beach.id,
    siteName: beach.siteName,
    hasSourceRecord: Boolean(record),
    waterTempF: record?.waterTempF ?? null,
    sampleTimestamp: record?.sampleTimestamp ?? null,
    bacteria30dGeomean: record?.bacteria30dGeomean ?? null,
    highSamples30d: record?.highSamples30d ?? null
  };
}

async function getBeachReliability(beachId, options = {}) {
  const [beach, temperature] = await Promise.all([
    getBeachById(beachId, options),
    getBeachTemperature(beachId, options)
  ]);

  return {
    beachId: beach.id,
    reliabilityCategory: beach.reliabilityCategory,
    reliabilityLabel: beach.reliabilityLabel,
    reliabilitySummary: beach.reliabilitySummary,
    bacteria30dGeomean: temperature.bacteria30dGeomean,
    highSamples30d: temperature.highSamples30d
  };
}

const beachClient = {
  getBeachIndex: loadManifest,
  getStatusDataset: loadStatusDataset,
  getTemperatureDataset: loadTemperatureDataset,
  getBeachStatus,
  getBeachTemperature,
  getBeachReliability
};

export default beachClient;
