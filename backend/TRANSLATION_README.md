# Certified Literal Legal Translation Module

> **CRITICAL WARNING FOR DEVELOPERS AND CONTRIBUTORS:**
> **DO NOT** attempt to make this translation "sound more fluent," "natural," or "idiomatic."
> **DO NOT** paraphrase, merge sentences, split sentences, reorder clauses, or omit legal boilerplate.
> This module produces **court-submission grade literal translations** for Pakistani courts.

---

## Why Literal Fidelity is Mandatory

In the Pakistani legal system, First Information Reports (FIRs), court decrees, plaints, written statements, and police diaries (*zimnis*) are frequently recorded in Urdu or Sindhi. When presented before High Courts, appellate tribunals, or international arbitration, they must be translated into English (or from English into provincial languages).

In court:
1. **Verbatim Correspondence:** A defense or prosecution advocate cross-examines witnesses on the exact words used in the FIR. If an automated translator "helpfully" rephrases *“عدالت میں حاضر نہ ہوا”* as *“he absconded”* instead of *“did not appear before the court”*, it alters the legal standard of proof.
2. **Prejudice from Paraphrasing:** Rewording, reorganizing clauses, or smoothing out repetitions creates discrepancies between the certified vernacular record and the English submission. Such discrepancies frequently form grounds for procedural objections, rejection of pleadings, or appellate reversals.
3. **Ambiguity Preservation:** Certain legal terms (e.g., *muddai*, *musamma*, *nekparveen*, *bad-niyati*, *tashadud*, *panchayat*) possess specific local connotations. A translator must **never guess** an interpretation. If an exact one-to-one statutory equivalent does not exist, the original term MUST be output in brackets alongside a literal gloss:
   ```text
   [ORIGINAL TERM — no exact English equivalent; literal sense: "..."]
   ```
   and logged in the `flaggedTerms` array for independent advocate verification.

---

## Technical Guarantees

Every translation produced by `translateLegalDocument(sourceText, sourceLang, targetLang)` guarantees:

1. **Sentence-by-Sentence Order:** Translates each clause and sentence in the identical sequence of the original document. No merging, splitting, or reordering.
2. **Zero Additions:** No explanatory context or inferred meaning is added into the running translated text.
3. **Zero Omissions:** Every word, phrase, honorific (*Sahib*, *Mohtaram*), repetition, and procedural boilerplate is translated.
4. **Structural Equivalence:** Paragraph numbers, section headings, and column layouts (standard in Pakistani FIR forms) are preserved exactly.
5. **Exact Proper Nouns & Identifiers:** Names, CNIC numbers, FIR numbers, dates, police station names, and statutory provisions (*Section 302/34 PPC*, *Section 497 CrPC*) are preserved without modification.
6. **Side-by-Side Dual Output:** Returns both the original sentence and translated sentence in structured `pairs: [{ index, original, translated }]` to enable visual side-by-side advocate auditing prior to filing.

---

## Supported Languages

| Code | Language | Typical Use Case |
|---|---|---|
| `ur` | Urdu | Primary language of police FIRs, subordinate court records, and Punjab/KPK/Balochistan documentation |
| `sd` | Sindhi | Subordinate court records, revenue records, and police documentation across Sindh Province |
| `roman-ur` | Roman Urdu | Informal legal communications, client witness statements, SMS/WhatsApp evidentiary transcripts |
| `en` | English | High Court and Supreme Court pleadings, statutes, formal correspondence |

---

## API Usage

### Endpoint: `POST /api/v1/translation/translate`

#### Request:
```json
{
  "sourceText": "مقدمہ درج رجسٹر کیا گیا ہے۔ ملزم مسمی علی ولد اکبر نے جان بوجھ کر مدعی پر حملہ کیا۔ دفعہ 324/34 پی پی سی لاگو کی گئی۔",
  "sourceLang": "ur",
  "targetLang": "en"
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "sourceLang": "ur",
    "targetLang": "en",
    "pairs": [
      {
        "index": 1,
        "original": "مقدمہ درج رجسٹر کیا گیا ہے۔",
        "translated": "The case has been registered in the register."
      },
      {
        "index": 2,
        "original": "ملزم مسمی علی ولد اکبر نے جان بوجھ کر مدعی پر حملہ کیا۔",
        "translated": "Accused named [MUSAMMA — literal sense: 'named/entitled'] Ali son of Akbar intentionally attacked the complainant [MUDDAI]."
      },
      {
        "index": 3,
        "original": "دفعہ 324/34 پی پی سی لاگو کی گئی۔",
        "translated": "Section 324/34 PPC was applied."
      }
    ],
    "fullTranslation": "The case has been registered in the register.\nAccused named Ali son of Akbar intentionally attacked the complainant.\nSection 324/34 PPC was applied.",
    "flaggedTerms": [
      {
        "term": "مسمی",
        "literalSense": "named / named person",
        "flag": "[MUSAMMA — no exact English equivalent; literal sense: \"named person\"]"
      },
      {
        "term": "مدعی",
        "literalSense": "complainant / claim maker",
        "flag": "[MUDDAI — no exact English equivalent; literal sense: \"claimant/complainant\"]"
      }
    ],
    "model": "claude-sonnet-4-6",
    "tokens": {
      "input_tokens": 320,
      "output_tokens": 210
    }
  }
}
```

---

## System Prompt Specification

The underlying model is strictly invoked with this prompt:

> *"You are a certified literal legal-document translator. Translate with maximum fidelity to the source wording. Do not paraphrase, summarize, interpret, or add any content not present in the original. If a term is ambiguous or has no direct equivalent, flag it instead of guessing. Preserve exact structure, numbering, names, dates, and numbers. This translation will be submitted in a Pakistani court, where even a minor unauthorized wording change can be challenged."*
