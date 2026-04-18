import axios from "axios";

const CT_BASE = "https://clinicaltrials.gov/api/v2/studies";

// =====================================================
// 1. SAFE VALUE HELPERS
// =====================================================

const safe = (v, fallback = "N/A") => v ?? fallback;

const sliceText = (t, n = 400) =>
  typeof t === "string" ? t.slice(0, n) : fallback("");

// =====================================================
// 2. API CALL LAYER
// =====================================================

export async function fetchClinicalTrials(disease, query, maxResults = 50) {
  try {
    const { data } = await axios.get(CT_BASE, {
      params: {
        "query.cond": disease,
        "query.term": query,
        pageSize: maxResults,
        format: "json"
      },
      timeout: 15000
    });

    const studies = data?.studies || [];
    
    // Fallback: If no results for combined query, search just for the disease
    if (!studies.length && query) {
      console.log(`⚠️  No trials for "${disease} + ${query}", falling back to "${disease}"`);
      const fallbackRes = await axios.get(CT_BASE, {
        params: { "query.cond": disease, pageSize: Math.floor(maxResults/2), format: "json" },
        timeout: 10000
      });
      return (fallbackRes.data?.studies || []).map(normalizeTrial).filter(Boolean);
    }

    return studies.map(normalizeTrial).filter(Boolean);
  } catch (err) {
    console.error("ClinicalTrials fetch error:", err.message);
    return [];
  }
}

// =====================================================
// 3. NORMALIZER (CORE CLEAN LAYER)
// =====================================================

function normalizeTrial(study) {
  const p = study?.protocolSection || {};

  const id = p.identificationModule || {};
  const status = p.statusModule || {};
  const desc = p.descriptionModule || {};
  const eligibility = p.eligibilityModule || {};
  const contacts = p.contactsLocationsModule || {};
  const design = p.designModule || {};
  const conditions = p.conditionsModule || {};

  return {
    nctId: safe(id.nctId),
    title: safe(id.briefTitle),
    officialTitle: safe(id.officialTitle),
    conditions: conditions.conditions || [],
    status: safe(status.overallStatus),
    phase: (design.phases || []).join(", ") || "N/A",
    description: sliceText(desc?.briefSummary, 400),
    eligibilityCriteria: sliceText(eligibility?.eligibilityCriteria, 300),
    minAge: safe(eligibility.minimumAge),
    maxAge: safe(eligibility.maximumAge),
    sex: safe(eligibility.sex),
    locations: extractLocations(contacts),
    contacts: extractContacts(contacts),
    startDate: safe(status?.startDateStruct?.date),
    completionDate: safe(status?.completionDateStruct?.date),
    url: id.nctId ? `https://clinicaltrials.gov/study/${id.nctId}` : null
  };
}

// =====================================================
// 4. LOCATION EXTRACTOR (CLEAN)
// =====================================================

function extractLocations(contacts) {
  const locs = contacts?.locations || [];

  return locs.slice(0, 3).map(loc => ({
    facility: safe(loc.facility, ""),
    city: safe(loc.city, ""),
    country: safe(loc.country, "")
  }));
}

// =====================================================
// 5. CONTACT EXTRACTOR
// =====================================================

function extractContacts(contacts) {
  const central = contacts?.centralContacts || [];

  return central.slice(0, 2).map(c => ({
    name: safe(c.name, ""),
    phone: safe(c.phone, ""),
    email: safe(c.email, "")
  }));
}

// =====================================================
// 6. OPTIONAL: LIGHT FILTER LAYER (FOR YOUR PIPELINE)
// =====================================================

export function filterTrials(trials, disease) {
  const d = disease.toLowerCase();

  return trials.filter(t => {
    const text = `${t.title} ${t.officialTitle} ${t.description}`.toLowerCase();
    return text.includes(d);
  });
}

// =====================================================
// 7. OPTIONAL: SIMPLE RANKING BOOSTER (PIPELINE READY)
// =====================================================

export function rankTrials(trials) {
  const priority = {
    RECRUITING: 5,
    ACTIVE_NOT_RECRUITING: 4,
    COMPLETED: 3,
    ENROLLING_BY_INVITATION: 2,
    NOT_YET_RECRUITING: 1
  };

  return [...trials].sort((a, b) => {
    return (priority[b.status] || 0) - (priority[a.status] || 0);
  });
}