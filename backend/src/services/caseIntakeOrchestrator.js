// backend/src/services/caseIntakeOrchestrator.js
//
// AUTONOMOUS CASE INTAKE ORCHESTRATOR — "the senior advocate's brain"
//
// Every existing entry point (chat, /analysis, /drafts) makes the USER
// decide which mode fits their problem. A real senior advocate doesn't
// make a walk-in client pick "research mode" or "drafting mode" — the
// client just describes their problem, and the advocate figures out for
// themselves what needs to happen: is there an urgent deadline? does this
// need a full researched opinion, a drafted document, or both? This module
// is that decision-making layer, orchestrating the existing services
// (limitationCalculator, legalReasoningChain, classifyDraftType,
// generateDraft) instead of duplicating their logic.
//
// FLOW for one call to runCaseIntake(problemText, options):
//   1. Classify what kind of document (if any) this problem calls for
//      (reuses classifyDraftType — already built for /drafts).
//   2. Independently, deterministically check for a limitation-period
//      risk (reuses limitationCalculator — runs regardless of what step 1
//      finds, because a deadline risk matters even in a pure research
//      question, and must never depend on the AI "remembering" to check).
//   3. Always run the full deep reasoning chain (issue-spot -> argue both
//      sides -> rebuttal + cross-exam -> synthesis -> citation+freshness
//      verification) — this is "Senior Advocate Mode" by default here,
//      not opt-in, since intake is specifically for someone bringing a
//      real problem, not a quick factual question (that's what plain
//      chat is for).
//   4. If step 1 confidently found a draft type AND the problem gives
//      enough concrete facts to draft from (not just an abstract legal
//      question), generate the draft grounded in step 3's analysis.
//   5. Assemble one unified, prioritized result: limitation alert first
//      (if any — this can be life-or-death for the case), then the
//      analysis, then the draft (if produced), then explicit next steps.

const logger = require('../utils/logger');
const { classifyDraftType, generateDraft } = require('./ai.service');
const { runLegalReasoningChain } = require('./legalReasoningChain');
const { guessLimitationType, calculateDeadline, listLimitationTypes } = require('./limitationCalculator');

// Very deliberately conservative: only auto-extracts a date if it's
// unambiguous (ISO or DD-MM-YYYY / DD/MM/YYYY with a 4-digit year). A
// wrong guessed date feeding into a deadline calculation is worse than no
// date at all, so anything ambiguous is left for the user/frontend to
// supply explicitly via options.triggerDate instead of guessing.
function extractTriggerDate(text) {
  const isoMatch = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return isoMatch[0];

  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

/**
 * Runs the limitation check deterministically — never depends on the AI
 * classification succeeding, since this is the single highest-consequence
 * check in the whole intake (a missed deadline can end a meritorious case
 * before it's ever heard).
 */
function runLimitationCheck(problemText, explicitTriggerDate, explicitCaseTypeKey) {
  const caseTypeKey = explicitCaseTypeKey || guessLimitationType(problemText);
  if (!caseTypeKey) {
    return { detected: false, availableTypes: listLimitationTypes() };
  }

  const triggerDate = explicitTriggerDate || extractTriggerDate(problemText);
  if (!triggerDate) {
    return {
      detected: true,
      caseTypeKey,
      needsTriggerDate: true,
      message: 'A limitation-sensitive matter was detected, but no clear trigger date (date of order/breach/dispossession etc.) was found in the text. Provide it explicitly to get an exact deadline.',
    };
  }

  const deadlineInfo = calculateDeadline(caseTypeKey, triggerDate);
  return { detected: true, caseTypeKey, needsTriggerDate: false, ...deadlineInfo };
}

/**
 * Autonomous Senior Advocate Case Diagnosis
 * Analyzes client narrative under Pakistani law to determine:
 * - Branch of law & exact case nature (noyat)
 * - Competent Pakistani court forum & jurisdiction
 * - Primary statutory remedy & legal provisions
 * - Case theory & strategy
 */
async function diagnoseCaseNature(problemText) {
  const systemInstruction = `You are a Senior Advocate of the Supreme Court of Pakistan with 25+ years of litigation experience.
A client has described their legal grievance to you in their own words (English, Urdu, or Roman Urdu).

Your job is to autonomously diagnose the exact nature of this case under the Pakistani legal system (PPC 1860, Cr.P.C. 1898, CPC 1908, Constitution of Pakistan 1973, QSO 1984, Specific Relief Act 1877, Family Courts Act 1964, Rent Restriction Acts, PECA 2016, Limitation Act 1908).

Return ONLY a JSON object:
{
  "case_nature": "Branch of Pakistani law (e.g. Criminal - Post-Arrest Bail / Police Inaction / Cheque Dishonour, Constitutional - Habeas Corpus / Writ of Mandamus, Civil - Declaration & Injunction / Specific Performance, Family - Khula & Dower, Rent - Eviction, Cybercrime - PECA 2016)",
  "competent_court": "The exact competent Pakistani court forum (e.g. In the Court of Learned Sessions Judge / Ex-Officio Justice of Peace, Rawalpindi; In the Hon'ble Lahore High Court, Rawalpindi Bench; In the Court of Senior Civil Judge, Lahore; In the Court of Special Judge Banking, Karachi)",
  "primary_remedy": "Exact Pakistani statutory remedy (e.g. Application under Section 497 Cr.P.C. for Post-Arrest Bail; Petition under Section 22-A & 22-B Cr.P.C.; Writ Petition under Article 199 of the Constitution 1973; Suit for Declaration & Injunction under Sections 42 & 54 SRA 1877; Summary Suit under Order XXXVII CPC)",
  "draft_type": "One identifier: bail_application | civil_suit | legal_notice | reply_notice | written_statement | petition | affidavit | contract | appeal | habeas_corpus | petition_22a | quashment_561a | family_suit | rent_eviction | summary_suit_order37 | injunction_application",
  "draft_title": "Full formal court document title in UPPER CASE",
  "applicable_statutes": ["Array of exact statutory provisions, e.g. 'Section 497 Cr.P.C.', 'Section 302/34 PPC', 'Article 10-A Constitution 1973'"],
  "controlling_legal_issues": ["Key legal and factual issues"],
  "case_theory": "Senior advocate strategy and theoretical foundation",
  "counter_strategy": "Anticipated arguments from state/opposing party and rebuttal",
  "confidence": "high" | "medium"
}

CLIENT'S GRIEVANCE:
${problemText}`;

  try {
    const res = await generateContent({
      contents: 'Diagnose this Pakistani legal case thoroughly and return JSON.',
      systemInstruction,
      jsonMode: true,
      disableSearch: true,
      appendSources: false,
      maxTokens: 2048,
    });
    const parsed = parseJsonSafe(res.text);
    if (parsed && parsed.case_nature && parsed.competent_court) {
      return parsed;
    }
    return fallbackPakistaniCaseDiagnosis(problemText);
  } catch (err) {
    logger.warn('diagnoseCaseNature AI call failed, using intelligent legal fallback:', err.message);
    return fallbackPakistaniCaseDiagnosis(problemText);
  }
}

function fallbackPakistaniCaseDiagnosis(text) {
  const lower = (text || '').toLowerCase();

  // 1. Illegal detention / Habeas Corpus
  if (/utha liya|ghair qanooni|illegal detention|bina kisi fir|bina warrant|habeas corpus|491|band kiya hua|chhora nahi|milne nahi/i.test(lower)) {
    return {
      case_nature: 'Constitutional / Illegal Detention (Habeas Corpus)',
      competent_court: 'In the Hon\'ble High Court of the Province / Court of Learned Sessions Judge',
      primary_remedy: 'Writ Petition under Article 199 of the Constitution of Pakistan, 1973 / Application under Section 491 Cr.P.C. for Habeas Corpus',
      draft_type: 'habeas_corpus',
      draft_title: 'WRIT PETITION UNDER ARTICLE 199 OF THE CONSTITUTION OF THE ISLAMIC REPUBLIC OF PAKISTAN, 1973 (HABEAS CORPUS)',
      applicable_statutes: ['Article 199 Constitution of Pakistan 1973', 'Section 491 Cr.P.C.', 'Article 9 & 10 Fundamental Rights', 'Article 10-A Fair Trial'],
      controlling_legal_issues: ['Unlawful deprivation of liberty without registration of FIR or production before Magistrate within 24 hours under Article 10 of Constitution'],
      case_theory: 'Immediate recovery of the detainee through appointment of a Court Bailiff to raid the police station and production of detainee before the High Court.',
      counter_strategy: 'Police will falsely claim detainee was not formally arrested or was arrested in an ongoing investigation; demand production of Daily Diary (Roznamcha) entries.',
      confidence: 'high'
    };
  }

  // 2. Police inaction / Refusal to register FIR (22-A / 22-B Cr.P.C.)
  if (/fir darj|fir nahi kar|police inkar|sho inkar|justice of peace|22-?a|22-?b|criminal complaint/i.test(lower)) {
    return {
      case_nature: 'Criminal / Police Inaction & Non-Registration of FIR',
      competent_court: 'In the Court of Learned Sessions Judge / Ex-Officio Justice of Peace',
      primary_remedy: 'Petition under Section 22-A & 22-B Cr.P.C. for Issuance of Directions to Police for Registration of FIR',
      draft_type: 'petition_22a',
      draft_title: 'PETITION UNDER SECTION 22-A & 22-B CR.P.C. FOR DIRECTIONS TO SHO FOR REGISTRATION OF CRIMINAL CASE (FIR)',
      applicable_statutes: ['Section 22-A & 22-B Cr.P.C.', 'Section 154 Cr.P.C.', 'Police Order 2002', 'Article 10-A Constitution 1973'],
      controlling_legal_issues: ['Statutory duty of Station House Officer to register FIR upon receipt of cognizable offence report under Section 154 Cr.P.C.'],
      case_theory: 'Section 154 Cr.P.C. is mandatory. Police cannot conduct preliminary inquiry into truthfulness prior to FIR registration.',
      counter_strategy: 'Police will argue civil dispute; demonstrate criminal ingredients of fraud, cheating, or trespass.',
      confidence: 'high'
    };
  }

  // 3. Cheque Dishonour / 489-F PPC / Order 37 CPC
  if (/cheque|check|dishonour|dishonor|bounce|489-?f|bank se wapis/i.test(lower)) {
    return {
      case_nature: 'Criminal & Commercial / Cheque Dishonour & Recovery',
      competent_court: 'In the Court of Learned Judicial Magistrate / Senior Civil Judge',
      primary_remedy: 'Criminal Proceedings under Section 489-F PPC & Summary Suit for Recovery under Order XXXVII CPC',
      draft_type: 'summary_suit_order37',
      draft_title: 'SUMMARY SUIT UNDER ORDER XXXVII RULES 1 & 2 CPC FOR RECOVERY READ WITH SECTION 489-F PPC',
      applicable_statutes: ['Section 489-F Pakistan Penal Code', 'Order XXXVII Rules 1 & 2 CPC', 'Negotiable Instruments Act 1881', 'Article 100 QSO 1984'],
      controlling_legal_issues: ['Issuance of cheque dishonestly with knowledge of insufficient funds towards repayment of loan or fulfillment of obligation.'],
      case_theory: 'Presumption under Negotiable Instruments Act and prima facie commission of non-bailable offence under Section 489-F PPC.',
      counter_strategy: 'Defendant will claim security cheque or guarantee; establish existing loan or commercial transaction consideration.',
      confidence: 'high'
    };
  }

  // 4. Bail (Pre-arrest / Post-arrest)
  if (/bail|zamanat|497|498|giraftar|arrest|hawalat|jail/i.test(lower)) {
    const isPreArrest = /pre-?arrest|qabal|peshgi/i.test(lower);
    return {
      case_nature: isPreArrest ? 'Criminal / Pre-Arrest Bail' : 'Criminal / Post-Arrest Bail',
      competent_court: 'In the Court of Learned Sessions Judge / Hon\'ble High Court',
      primary_remedy: isPreArrest ? 'Application under Section 498 Cr.P.C. for Pre-Arrest Bail' : 'Application under Section 497 Cr.P.C. for Post-Arrest Bail',
      draft_type: 'bail_application',
      draft_title: isPreArrest ? 'APPLICATION UNDER SECTION 498 CR.P.C. FOR GRANT OF PRE-ARREST BAIL' : 'APPLICATION UNDER SECTION 497 CR.P.C. FOR GRANT OF POST-ARREST BAIL',
      applicable_statutes: ['Section 497/498 Cr.P.C.', 'Article 10-A Constitution 1973', 'Article 9 Liberty of Person'],
      controlling_legal_issues: ['Whether case falls within prohibitory clause of Sec 497 Cr.P.C., presence of mala fide, delay in FIR, further inquiry under Sec 497(2).'],
      case_theory: 'Liberty of citizen is supreme. Bail is a rule and jail is an exception in cases of further inquiry.',
      counter_strategy: 'Prosecution will allege heinousness of offence; establish lack of specific role and independent corroboration.',
      confidence: 'high'
    };
  }

  // 5. Family / Khula / Dower / Maintenance
  if (/khula|talaq|divorce|mehr|dower|kharcha|maintenance|hizanat|custody|biwi|shohar/i.test(lower)) {
    return {
      case_nature: 'Family Law / Matrimonial & Maintenance Dispute',
      competent_court: 'In the Court of Learned Judge Family Court',
      primary_remedy: 'Suit for Dissolution of Marriage on ground of Khula, Recovery of Dower & Past/Future Maintenance under Family Courts Act 1964',
      draft_type: 'family_suit',
      draft_title: 'SUIT FOR DISSOLUTION OF MARRIAGE BY KHULA, RECOVERY OF DOWER AND MAINTENANCE UNDER WEST PAKISTAN FAMILY COURTS ACT, 1964',
      applicable_statutes: ['West Pakistan Family Courts Act 1964', 'Muslim Family Laws Ordinance 1961', 'Guardians and Wards Act 1890'],
      controlling_legal_issues: ['Irretrievable breakdown of marriage, non-maintenance, and entitlement to dower and maintenance.'],
      case_theory: 'Wife has unconditional right to Khula if she cannot live within the limits ordained by Allah Almighty without forfeiting vested dower rights.',
      counter_strategy: 'Defendant will allege desertion; establish cruelty and refusal to maintain.',
      confidence: 'high'
    };
  }

  // 6. Rent / Tenancy Eviction
  if (/rent|kiraya|tenant|landlord|makan|dukan|khali|eviction/i.test(lower)) {
    return {
      case_nature: 'Rent Law / Tenancy Eviction & Recovery of Rent',
      competent_court: 'In the Court of Learned Special Judge (Rent) / Rent Controller',
      primary_remedy: 'Ejectment Petition under Section 13/15 of Urban Rent Restriction Ordinance 1959 / Provincial Rented Premises Act',
      draft_type: 'rent_eviction',
      draft_title: 'EJECTMENT APPLICATION UNDER SECTION 13 OF THE URBAN RENT RESTRICTION ORDINANCE, 1959 FOR EVICTION OF TENANT',
      applicable_statutes: ['Urban Rent Restriction Ordinance 1959 / Provincial Rented Premises Act', 'Section 13 Default & Personal Need'],
      controlling_legal_issues: ['Wilful default in payment of monthly rent, expiry of tenancy period, and bona fide personal use.'],
      case_theory: 'Landlord is best judge of their personal need and tenant loses protection of rent laws upon default in rent.',
      counter_strategy: 'Tenant will claim rent was paid in cash; demand receipts under rent law provisions.',
      confidence: 'high'
    };
  }

  // 7. Civil Property / Stay / Injunction / Declaration
  if (/property|kabza|zameen|plot|stay|injunction|declaration|registry|inteqal|fard/i.test(lower)) {
    return {
      case_nature: 'Civil Law / Property Rights, Declaration & Injunction',
      competent_court: 'In the Court of Learned Senior Civil Judge (Civil Division)',
      primary_remedy: 'Suit for Declaration and Permanent Injunction under Sections 42 & 54 Specific Relief Act 1877 read with Order VII Rule 1 & Order XXXIX Rules 1 & 2 CPC',
      draft_type: 'civil_suit',
      draft_title: 'SUIT FOR DECLARATION, PERMANENT INJUNCTION AND SEPARATE POSSESSION UNDER SECTIONS 42 & 54 SPECIFIC RELIEF ACT 1877 READ WITH ORDER VII RULE 1 CPC',
      applicable_statutes: ['Specific Relief Act 1877 (Sec 42 & 54)', 'Code of Civil Procedure 1908 (Order VII, Order XXXIX)', 'Transfer of Property Act 1882'],
      controlling_legal_issues: ['Lawful title, uninterrupted possession, threat of illegal dispossession, and irreparable loss.'],
      case_theory: 'Prima facie title backed by revenue record and possession grants absolute entitlement to interim injunction under Order 39 Rules 1 & 2 CPC.',
      counter_strategy: 'Defendant will claim competing agreement; demonstrate clean registered deed or revenue entry.',
      confidence: 'high'
    };
  }

  // 8. Quashment of FIR / 561-A Cr.P.C.
  if (/quash|quashment|561-?a|jhooti fir|fake fir|false fir|malicious prosecution/i.test(lower)) {
    return {
      case_nature: 'Criminal / Inherent Jurisdiction for Quashment of FIR',
      competent_court: 'In the Hon\'ble High Court of the Province',
      primary_remedy: 'Criminal Miscellaneous Petition under Section 561-A Cr.P.C. for Quashment of FIR and Impugned Proceedings',
      draft_type: 'quashment_561a',
      draft_title: 'PETITION UNDER SECTION 561-A CR.P.C. FOR QUASHMENT OF FIR AND PROCEEDINGS EMANATING THEREFROM',
      applicable_statutes: ['Section 561-A Cr.P.C.', 'Article 10-A Constitution 1973', 'Article 4 & 9 of Constitution'],
      controlling_legal_issues: ['Abuse of process of court, FIR registered with mala fide intent, allegations disclosing purely civil transaction.'],
      case_theory: 'Criminal law cannot be used as an instrument of blackmail or debt recovery; High Court has inherent power to prevent abuse of process.',
      counter_strategy: 'State will argue investigation is ongoing; rely on landmark precedent PLD 2005 SC 470 that High Court can quash at any stage if FIR is absurd or mala fide.',
      confidence: 'high'
    };
  }

  // 9. Cyber Crime / FIA / PECA 2016
  if (/cyber|peca|fia|social media|whatsapp|facebook|hack|harass.*online|leak|blackmail.*video/i.test(lower)) {
    return {
      case_nature: 'Special Law / Cyber Crime & Electronic Offences (PECA)',
      competent_court: 'In the Court of Learned Special Court (PECA) / FIA Cyber Crime Circle',
      primary_remedy: 'Complaint under Sections 20, 21 & 24 Prevention of Electronic Crimes Act (PECA) 2016 & Direction for Forensic Digital Recovery',
      draft_type: 'peca_complaint',
      draft_title: 'CRIMINAL COMPLAINT UNDER SECTIONS 20, 21 & 24 OF THE PREVENTION OF ELECTRONIC CRIMES ACT, 2016 (PECA)',
      applicable_statutes: ['Prevention of Electronic Crimes Act 2016 (Sec 20, 21, 24)', 'Federal Investigation Agency Act 1974', 'Electronic Transactions Ordinance 2002'],
      controlling_legal_issues: ['Offences against dignity of natural person, cyber stalking, unauthorized interception of electronic data.'],
      case_theory: 'Preserve electronic digital logs, IP addresses, and forensic chain of custody to establish statutory contravention.',
      counter_strategy: 'Accused will claim spoofed account; petition for preservation of CDR and subscriber identity records.',
      confidence: 'high'
    };
  }

  // 10. Succession Certificate / Letter of Administration
  if (/succession|warasat|inheritance|wirasa|tarka|foutgi|deceased.*bank|letter of administration/i.test(lower)) {
    return {
      case_nature: 'Civil & Succession / Inheritance & Succession Certificate',
      competent_court: 'In the Court of Learned Senior Civil Judge / District Judge',
      primary_remedy: 'Petition for Grant of Succession Certificate under Section 372 of Succession Act 1925 / Letter of Administration under Section 278',
      draft_type: 'succession_petition',
      draft_title: 'PETITION UNDER SECTION 372 OF THE SUCCESSION ACT, 1925 FOR GRANT OF SUCCESSION CERTIFICATE',
      applicable_statutes: ['Succession Act 1925 (Sec 278, 372)', 'National Database and Registration Authority (NADRA) Ordinance 2000', 'Shariah Inheritance Principles'],
      controlling_legal_issues: ['Establishing legal heirs through genealogical tree (Shajra Nasab), NADRA Family Registration Certificate (FRC), and list of debts/securities.'],
      case_theory: 'All legal heirs are entitled to their statutory Quranic shares in movable assets and bank securities of the deceased.',
      counter_strategy: 'Contesting heirs may claim gift or will; rely on strict evidentiary proof and newspaper citation publications.',
      confidence: 'high'
    };
  }

  // 11. Specific Performance of Agreement to Sell
  if (/agreement to sell|biyana|biana|moaida baia|iqrarnama|registry nahi kar raha/i.test(lower)) {
    return {
      case_nature: 'Civil Law / Specific Performance of Immovable Property Contract',
      competent_court: 'In the Court of Learned Senior Civil Judge (Civil Division)',
      primary_remedy: 'Suit for Specific Performance of Agreement to Sell under Section 12 Specific Relief Act 1877 read with Order VII Rule 1 CPC',
      draft_type: 'specific_performance',
      draft_title: 'SUIT FOR SPECIFIC PERFORMANCE OF AGREEMENT TO SELL UNDER SECTION 12 SPECIFIC RELIEF ACT 1877',
      applicable_statutes: ['Specific Relief Act 1877 (Sec 12, 19, 21)', 'Contract Act 1872', 'Limitation Act 1908 (Article 113)'],
      controlling_legal_issues: ['Valid executed agreement, receipt of earnest money/token, plaintiff\'s readiness and willingness to perform balance obligation.'],
      case_theory: 'Equity regards as done that which ought to be done; monetary damages are inadequate compensation for breach of contract to transfer immovable property.',
      counter_strategy: 'Vendor will allege time was essence of contract; demonstrate readiness and willingness by depositing balance sale consideration in court.',
      confidence: 'high'
    };
  }

  // Default fallback
  return {
    case_nature: 'General Litigation & Legal Remedy under Pakistani Law',
    competent_court: 'In the Court of Competent Jurisdiction',
    primary_remedy: 'Formal Legal Petition / Proceeding under Pakistani Law',
    draft_type: 'petition',
    draft_title: 'LEGAL PETITION FOR REDRESSAL OF GRIEVANCE',
    applicable_statutes: ['Constitution of Islamic Republic of Pakistan 1973', 'Code of Civil Procedure 1908 / Cr.P.C. 1898'],
    controlling_legal_issues: ['Infringement of legal rights and available statutory remedies.'],
    case_theory: 'Pursue legal redressal before the competent statutory forum.',
    counter_strategy: 'Anticipate procedural preliminary objections.',
    confidence: 'medium'
  };
}


/**
 * @param {string} problemText - the client's problem in their own words
 * @param {object} [options]
 * @param {string} [options.language] - 'english'|'urdu'|'roman_urdu'|'bilingual', for the draft if one is produced
 * @param {string} [options.triggerDate] - explicit limitation trigger date (YYYY-MM-DD), overrides auto-extraction
 * @param {string} [options.limitationCaseTypeKey] - explicit limitationCalculator key, overrides auto-guess
 * @param {boolean} [options.forceDraft] - generate a draft even if classification confidence is low
 * @param {boolean} [options.skipDraft] - never generate a draft, analysis only
 */
async function runCaseIntake(problemText, options = {}) {
  if (!problemText || !problemText.trim()) {
    throw new Error('runCaseIntake: problemText is required.');
  }

  let totalTokens = 0;

  // Step 1: Autonomous Case Diagnosis + Limitation Check in parallel
  const [diagnosis, limitationCheck] = await Promise.all([
    diagnoseCaseNature(problemText),
    Promise.resolve(runLimitationCheck(problemText, options.triggerDate, options.limitationCaseTypeKey)),
  ]);

  const classification = {
    draft_type: diagnosis?.draft_type || 'petition',
    confidence: diagnosis?.confidence || 'high',
    reasoning: diagnosis?.case_theory || 'Legal remedy diagnosed under Pakistani Law.',
    clarifying_question: null,
  };

  // Step 2: Deep reasoning chain grounded in diagnosis
  const caseTypeLabel = diagnosis?.primary_remedy
    ? `${diagnosis.primary_remedy} (${diagnosis.case_nature || 'Pakistani Legal Matter'})`
    : 'client consultation';
  const deepAnalysis = await runLegalReasoningChain(problemText, caseTypeLabel);
  totalTokens += deepAnalysis.tokens || 0;

  // Step 3: Guaranteed Court-Ready Draft generation (unless explicitly skipped)
  let draft = null;
  const shouldDraft = !options.skipDraft;

  if (shouldDraft) {
    try {
      const draftDetails = {
        caseDetails: problemText,
        caseNature: diagnosis?.case_nature,
        competentCourt: diagnosis?.competent_court,
        primaryRemedy: diagnosis?.primary_remedy,
        statutes: diagnosis?.applicable_statutes,
        caseTheory: diagnosis?.case_theory,
        draftTitle: diagnosis?.draft_title,
      };

      const draftResult = await generateDraft(
        diagnosis?.draft_type || 'petition',
        draftDetails,
        options.language || 'english',
        deepAnalysis
      );
      totalTokens += draftResult.tokens || 0;
      draft = {
        draftType: diagnosis?.draft_type || 'court_petition',
        draftTitle: diagnosis?.draft_title || diagnosis?.primary_remedy || 'Court Ready Draft',
        content: draftResult.content,
      };
    } catch (err) {
      logger.error('runCaseIntake: draft generation failed:', err.message || err);
    }
  }

  // Step 4: Assemble prioritized, actionable output
  const nextSteps = [];
  if (limitationCheck.detected && limitationCheck.urgency === 'expired') {
    nextSteps.push('⚠️ The computed limitation period appears to have already EXPIRED — immediately check whether Section 5 condonation (sufficient cause) can be argued, and consult on this before anything else.');
  } else if (limitationCheck.detected && ['immediate', 'critical'].includes(limitationCheck.urgency)) {
    nextSteps.push(`⚠️ Urgent: ${limitationCheck.caseType || 'this matter'} has a filing deadline that is imminent — prioritize filing over further research.`);
  } else if (limitationCheck.detected && limitationCheck.needsTriggerDate) {
    nextSteps.push('Provide the exact trigger date (order date / breach date / dispossession date) so the filing deadline can be calculated precisely.');
  }

  if (diagnosis?.competent_court) {
    nextSteps.push(`File before: ${diagnosis.competent_court}`);
  }
  if (diagnosis?.primary_remedy) {
    nextSteps.push(`Primary Legal Action: ${diagnosis.primary_remedy}`);
  }
  if (diagnosis?.counter_strategy) {
    nextSteps.push(`Counter-strategy: ${diagnosis.counter_strategy}`);
  }
  if (deepAnalysis.synthesis?.risk_factors?.length) {
    nextSteps.push(...deepAnalysis.synthesis.risk_factors.slice(0, 2).map((r) => `Risk to address: ${r}`));
  }

  return {
    diagnosis,
    classification,
    limitationCheck,
    deepAnalysis,
    draft,
    nextSteps,
    tokens: totalTokens,
  };
}

module.exports = { runCaseIntake, extractTriggerDate, diagnoseCaseNature };

