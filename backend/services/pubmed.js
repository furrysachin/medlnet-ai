import axios from "axios";
import xml2js from "xml2js";

const PUBMED_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_FETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeGet(url, params, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await axios.get(url, { params, timeout: 15000 });
    } catch (err) {
      if (err.response?.status === 429 && i < retries) {
        await sleep(1500 * (i + 1)); // 1.5s, 3s backoff
        continue;
      }
      throw err;
    }
  }
}

// ===============================
// MAIN FUNCTION
// ===============================
export async function fetchPubMedPapers(query, maxResults = 100) {
  try {
    if (!query) return [];

    // ===============================
    // 1. SEARCH (GLOBAL + INDIA)
    // ===============================
    const [globalRes, indiaRes] = await Promise.all([
      safeGet(PUBMED_SEARCH, {
        db: "pubmed",
        term: query,
        retmax: Math.floor(maxResults * 0.7),
        sort: "pub date",
        retmode: "json",
      }),
      safeGet(PUBMED_SEARCH, {
        db: "pubmed",
        term: `${query} India`,
        retmax: Math.floor(maxResults * 0.3),
        sort: "pub date",
        retmode: "json",
      }),
    ]);

    const globalIds = globalRes.data?.esearchresult?.idlist || [];
    const indiaIds = indiaRes.data?.esearchresult?.idlist || [];
    const ids = [...new Set([...indiaIds, ...globalIds])].slice(0, maxResults);
    if (ids.length === 0) return [];

    const fetchRes = await safeGet(PUBMED_FETCH, {
      db: "pubmed",
      id: ids.join(","),
      retmode: "xml",
    });

    if (!fetchRes.data) return [];

    // ===============================
    // 3. XML PARSE (SAFE MODE)
    // ===============================
    const parsed = await xml2js.parseStringPromise(fetchRes.data, {
      explicitArray: false,
      ignoreAttrs: false,
      trim: true,
    });

    const articles =
      parsed?.PubmedArticleSet?.PubmedArticle ||
      parsed?.PubmedArticleSet?.Article ||
      [];

    const list = Array.isArray(articles) ? articles : [articles];

    // ===============================
    // 4. TRANSFORM CLEAN OUTPUT
    // ===============================
    const results = list
      .map((article) => {
        try {
          const medline = article?.MedlineCitation || {};
          const art = medline?.Article || {};
          const pmid = medline?.PMID?._ || medline?.PMID || "";

          // ---- TITLE SAFE ----
          const title =
            typeof art?.ArticleTitle === "string"
              ? art.ArticleTitle
              : art?.ArticleTitle?._ || "N/A";

          // ---- ABSTRACT SAFE (PubMed is messy here) ----
          let abstract = "";

          const abs = art?.Abstract?.AbstractText;

          if (Array.isArray(abs)) {
            abstract = abs.map((a) => (typeof a === "string" ? a : a?._ || "")).join(" ");
          } else if (typeof abs === "string") {
            abstract = abs;
          } else {
            abstract = abs?._ || "No abstract available";
          }

          abstract = abstract.slice(0, 600);

          // ---- YEAR SAFE ----
          const year =
            art?.Journal?.JournalIssue?.PubDate?.Year ||
            art?.Journal?.JournalIssue?.PubDate?.MedlineDate ||
            "N/A";

          const journal = art?.Journal?.Title || "N/A";

          // ---- AUTHORS SAFE ----
          const authorsRaw = art?.AuthorList?.Author || [];
          const authorsArray = Array.isArray(authorsRaw)
            ? authorsRaw
            : authorsRaw
            ? [authorsRaw]
            : [];

          const authors = authorsArray
            .slice(0, 3)
            .map((a) => {
              const last = a?.LastName || "";
              const first = a?.ForeName || "";
              return `${first} ${last}`.trim();
            })
            .filter(Boolean)
            .join(", ") || "N/A";

          // ---- FINAL OBJECT ----
          return {
            title,
            abstract,
            authors,
            year,
            journal,
            source: "PubMed",
            url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "",
            pmid,
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .filter((p) => p.title && p.title !== "N/A");

    return results;
  } catch (err) {
    console.error("PubMed pipeline error:", err.message);
    return [];
  }
}