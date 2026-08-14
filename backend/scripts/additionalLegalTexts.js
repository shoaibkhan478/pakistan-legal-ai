/**
 * ADD-ON list for downloadLegalTexts.js
 * -------------------------------------
 * Merge these entries into the existing `statutes` (or equivalent) array
 * in your downloadLegalTexts.js script. Follows the same
 * `statute__<code>__<year>.pdf` naming convention you already use for
 * PPC / CrPC / QSO / CPC.
 *
 * IMPORTANT: I could not run these URLs against your live script (no
 * access to your machine/repo from this chat). A few are confirmed
 * reachable, most are built from the same known-good sources
 * (sja.gos.pk/assets/BareActs/, punjabcode.punjab.gov.pk,
 * pakistancode.gov.pk) but NOT individually re-verified here — open each
 * link once in a browser before you run the ingest, and drop/replace any
 * that 404. Government sites reorganize files often.
 *
 * category: "criminal" | "civil"  -> just for your own filtering/logging
 */

module.exports = [

  // ================= CRIMINAL LAW =================
  {
    code: "CNSA",
    title: "Control of Narcotic Substances Act, 1997",
    year: 1997,
    category: "criminal",
    url: "http://sja.gos.pk/assets/BareActs/CONTROL%20OF%20NARCOTIC%20SUBSTANCES%20ACT.1997.pdf",
  },
  {
    code: "ATA",
    title: "Anti-Terrorism Act, 1997",
    year: 1997,
    category: "criminal",
    url: "https://na.gov.pk/uploads/documents/1333523681_951.pdf",
  },
  {
    code: "PECA",
    title: "Prevention of Electronic Crimes Act, 2016",
    year: 2016,
    category: "criminal",
    url: "https://na.gov.pk/uploads/documents/1470910659_707.pdf",
  },
  {
    code: "JJSA",
    title: "Juvenile Justice System Act, 2018",
    year: 2018,
    category: "criminal",
    url: "https://na.gov.pk/uploads/documents/1528358517_212.pdf",
  },
  {
    code: "AMLA",
    title: "Anti-Money Laundering Act, 2010",
    year: 2010,
    category: "criminal",
    url: "https://www.sbp.org.pk/l_frame/AMLA-2010.pdf",
  },
  {
    code: "PWCLA",
    title: "Protection of Women (Criminal Laws Amendment) Act, 2006",
    year: 2006,
    category: "criminal",
    url: "https://na.gov.pk/uploads/documents/1333523681_211.pdf",
  },
  {
    code: "DBGRA",
    title: "Dowry and Bridal Gifts (Restriction) Act, 1976",
    year: 1976,
    category: "criminal",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/Dowry_and_Bridal_Gifts_Restriction_Act_1976.pdf",
  },
  {
    code: "PACT",
    title: "Prevention and Control of Human Trafficking Act, 2018",
    year: 2018,
    category: "criminal",
    url: "https://na.gov.pk/uploads/documents/1544513002_611.pdf",
  },

  // ================= CIVIL LAW =================
  {
    code: "CA",
    title: "Contract Act, 1872",
    year: 1872,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/Contract_Act_1872.doc.pdf",
  },
  {
    code: "TPA",
    title: "Transfer of Property Act, 1882",
    year: 1882,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_TRANSFER_OF_PROPERTY_ACT,_1882.pdf",
  },
  {
    code: "SRA",
    title: "Specific Relief Act, 1877",
    year: 1877,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_SPECIFIC_RELIEF_ACT,_1877.pdf",
  },
  {
    code: "LA",
    title: "Limitation Act, 1908",
    year: 1908,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_LIMITATION_ACT,_1908.pdf",
  },
  {
    code: "RA",
    title: "Registration Act, 1908",
    year: 1908,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_REGISTRATION_ACT,_1908.pdf",
  },
  {
    code: "SOGA",
    title: "Sale of Goods Act, 1930",
    year: 1930,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_SALE_OF_GOODS_ACT,_1930.pdf",
  },
  {
    code: "PA",
    title: "Partnership Act, 1932",
    year: 1932,
    category: "civil",
    url: "https://pakistancode.gov.pk/pdffiles/administratorbbc0b5b0d78c35e99e3b94f6b77b69db.pdf",
  },
  {
    code: "NIA",
    title: "Negotiable Instruments Act, 1881",
    year: 1881,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_NEGOTIABLE_INSTRUMENTS_ACT,_1881.pdf",
  },
  {
    code: "AA",
    title: "Arbitration Act, 1940",
    year: 1940,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_ARBITRATION_ACT,_1940.pdf",
  },
  {
    code: "SA",
    title: "Succession Act, 1925",
    year: 1925,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_SUCCESSION_ACT,_1925.pdf",
  },
  {
    code: "GWA",
    title: "Guardians and Wards Act, 1890",
    year: 1890,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_GUARDIANS_AND_WARDS_ACT,_1890.pdf",
  },
  {
    code: "MFLO",
    title: "Muslim Family Laws Ordinance, 1961",
    year: 1961,
    category: "civil",
    url: "https://molaw.gov.pk/SiteImage/Downloads/Muslim%20Family%20Laws%20Ordinance,%201961.pdf",
  },
  {
    code: "WPFCA",
    title: "West Pakistan Family Courts Act, 1964",
    year: 1964,
    category: "civil",
    url: "https://punjabcode.punjab.gov.pk/uploads/articles/THE_WEST_PAKISTAN_FAMILY_COURTS_ACT,_1964.pdf",
  },
  {
    code: "CoA",
    title: "Companies Act, 2017",
    year: 2017,
    category: "civil",
    url: "https://www.secp.gov.pk/document/companies-act-2017/",
  },
];
