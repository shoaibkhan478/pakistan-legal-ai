const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool, query } = require('../src/config/database');

const legalDataset = [
  // --- PAKISTAN PENAL CODE (PPC) 1860 ---
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 489-F',
    title: 'Dishonestly issuing a cheque',
    chapter: 'Chapter XVIII - Offenses Relating to Documents and to Property Marks',
    full_text: 'Section 489-F PPC: Dishonestly issuing a cheque. Whoever dishonestly issues a cheque towards repayment of a loan or fulfillment of an obligation which is dishonoured on presentation, shall be punishable with imprisonment which may extend to three years, or with fine, or with both, unless he can establish, for which the burden of proof shall rest on him, that he had made arrangements with his bank to ensure that the cheque would be honoured and that the bank was at fault in not honouring the cheque. Offence is non-bailable, cognizable, and compoundable with the permission of the court.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 302',
    title: 'Punishment of Qatl-i-amd (Intentional Murder)',
    chapter: 'Chapter XVI - Offences Affecting the Human Body',
    full_text: 'Section 302 PPC: Punishment of Qatl-i-amd. Whoever commits qatl-i-amd shall, subject to the provisions of this Chapter be: (a) punished with death as qisas; (b) punished with death or imprisonment for life as ta\'zir, having regard to the facts and circumstances of the case, if the proof in either of the forms specified in Section 304 is not available; or (c) punished with imprisonment of either description for a term which may extend to twenty-five years, where according to the Injunctions of Islam the punishment of qisas is not applicable. Offence is non-bailable, cognizable, and compoundable under Section 345 CrPC.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 324',
    title: 'Attempt to commit Qatl-i-amd',
    chapter: 'Chapter XVI - Offences Affecting the Human Body',
    full_text: 'Section 324 PPC: Attempt to commit Qatl-i-amd. Whoever does any act with such intention or knowledge, and under such circumstances, that, if he by that act caused death, he would be guilty of qatl-i-amd, shall be punished with imprisonment of either description for a term which may extend to ten years, but shall not be less than five years if hurt is caused to any person, and shall also be liable to fine. If hurt is caused, the offender shall also be liable to the punishment provided for the hurt caused. Non-bailable and cognizable.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 376',
    title: 'Punishment for rape (Zina-bil-jabr)',
    chapter: 'Chapter XVI - Offences Affecting the Human Body',
    full_text: 'Section 376 PPC: Punishment for rape. (1) Whoever commits rape shall be punished with death or imprisonment of either description for a term which shall not be less than ten years nor more than twenty-five years, and shall also be liable to fine. (2) When rape is committed by two or more persons in furtherance of common intention (gang rape), each person shall be punished with death or imprisonment for life. Non-bailable, non-compoundable, and cognizable.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 420',
    title: 'Cheating and dishonestly inducing delivery of property',
    chapter: 'Chapter XVII - Offences Against Property',
    full_text: 'Section 420 PPC: Cheating and dishonestly inducing delivery of property. Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, or to make, alter or destroy the whole or any part of a valuable security, or anything which is signed or sealed, and which is capable of being converted into a valuable security, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine. Cognizable and bailable with court discretion.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 406',
    title: 'Punishment for criminal breach of trust',
    chapter: 'Chapter XVII - Offences Against Property',
    full_text: 'Section 406 PPC: Punishment for criminal breach of trust. Whoever commits criminal breach of trust shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both. Requires proof of entrustment of property and dishonest misappropriation or conversion to own use. Cognizable and non-bailable.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 468',
    title: 'Forgery for purpose of cheating',
    chapter: 'Chapter XVIII - Offenses Relating to Documents',
    full_text: 'Section 468 PPC: Forgery for purpose of cheating. Whoever commits forgery, intending that the document or electronic record forged shall be used for the purpose of cheating, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine. Cognizable, non-bailable.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 471',
    title: 'Using as genuine a forged document',
    chapter: 'Chapter XVIII - Offenses Relating to Documents',
    full_text: 'Section 471 PPC: Using as genuine a forged document. Whoever fraudulently or dishonestly uses as genuine any document or electronic record which he knows or has reason to believe to be a forged document or electronic record, shall be punished in the same manner as if he had forged such document or electronic record.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 506',
    title: 'Punishment for criminal intimidation',
    chapter: 'Chapter XXII - Criminal Intimidation, Insult and Annoyance',
    full_text: 'Section 506 PPC: Punishment for criminal intimidation. Whoever commits the offence of criminal intimidation shall be punished with imprisonment of either description for a term which may extend to two years, or with fine, or with both; and if the threat be to cause death or grievous hurt, or to cause destruction of any property by fire, the imprisonment may extend to seven years, or with fine, or with both.'
  },
  {
    source_type: 'statute',
    statute_name: 'PPC',
    article_or_section: 'Section 498-A',
    title: 'Prohibition of depriving woman from inheriting property',
    chapter: 'Chapter XX - Offences Relating to Marriage',
    full_text: 'Section 498-A PPC: Whoever by deceitful or illegal means deprives any woman from inheriting any movable or immovable property at the time of opening of succession shall be punished with imprisonment of either description for a term which may extend to ten years but shall not be less than five years or with a fine of one million rupees or both.'
  },

  // --- CODE OF CRIMINAL PROCEDURE (CrPC) 1898 ---
  {
    source_type: 'statute',
    statute_name: 'CrPC',
    article_or_section: 'Section 497',
    title: 'When bail may be taken in case of non-bailable offence',
    chapter: 'Chapter XXXIX - Of Bail',
    full_text: 'Section 497 CrPC: Bail in non-bailable offences. (1) When any person accused of any non-bailable offence is arrested or detained without warrant by an officer in charge of a police station, or appears or is brought before a Court, he may be released on bail, but he shall not be so released if there appear reasonable grounds for believing that he has been guilty of an offence punishable with death or imprisonment for life or imprisonment for ten years. Provided that the Court may direct that any person under the age of sixteen years or any woman or any sick or infirm person accused of such an offence be released on bail. (2) If at any stage of investigation, inquiry or trial there are not reasonable grounds for believing that accused has committed non-bailable offence, but sufficient grounds for further inquiry into his guilt, accused shall be released on bail pending inquiry.'
  },
  {
    source_type: 'statute',
    statute_name: 'CrPC',
    article_or_section: 'Section 498',
    title: 'Power to direct admission to bail or reduction of bail (Pre-Arrest Bail)',
    chapter: 'Chapter XXXIX - Of Bail',
    full_text: 'Section 498 CrPC: Amount of bond and power to direct admission to bail. The amount of every bond executed under this Chapter shall be fixed with due regard to the circumstances of the case, and shall not be excessive; and the High Court or Court of Session may, in any case, whether there be an appeal on conviction or not, direct that any person be admitted to bail, or that the bail required by a police-officer or Magistrate be reduced. Governs Anticipatory / Pre-arrest bail where petitioner proves ulterior motives, mala fide on the part of police or complainant, and imminent danger of humiliation.'
  },
  {
    source_type: 'statute',
    statute_name: 'CrPC',
    article_or_section: 'Section 154',
    title: 'Information in cognizable cases (Registration of FIR)',
    chapter: 'Chapter XIV - Information to the Police and their Powers to Investigate',
    full_text: 'Section 154 CrPC: Information in cognizable cases. Every information relating to the commission of a cognizable offence if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant; and every such information, whether given in writing or reduced to writing as aforesaid, shall be signed by the person giving it, and the substance thereof shall be entered in a book to be kept by such officer in such form as the Provincial Government may prescribe in this behalf.'
  },
  {
    source_type: 'statute',
    statute_name: 'CrPC',
    article_or_section: 'Section 561-A',
    title: 'Saving of inherent power of High Court (Quashment of FIR / Proceedings)',
    chapter: 'Chapter XLVI - Miscellaneous',
    full_text: 'Section 561-A CrPC: Inherent power of High Court. Nothing in this Code shall be deemed to limit or affect the inherent power of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice. Used for quashment of FIRs registered with mala fide, civil disputes converted into criminal cases, or proceedings without legal jurisdiction.'
  },

  // --- SPECIFIC RELIEF ACT 1877 ---
  {
    source_type: 'statute',
    statute_name: 'Specific Relief Act',
    article_or_section: 'Section 42',
    title: 'Discretion of Court as to declaration of status or right',
    chapter: 'Chapter VI - Of Declaratory Decrees',
    full_text: 'Section 42 Specific Relief Act 1877: Discretion of Court as to declaration of status or right. Any person entitled to any legal character, or to any right as to any property, may institute a suit against any person denying, or interested to deny, his title to such character or right, and the Court may in its discretion make therein a declaration that he is so entitled, and the plaintiff need not in such suit ask for any further relief: Provided that no Court shall make any such declaration where the plaintiff, being able to seek further relief than a mere declaration of title, omits to do so.'
  },
  {
    source_type: 'statute',
    statute_name: 'Specific Relief Act',
    article_or_section: 'Section 12',
    title: 'Cases in which specific performance enforceable',
    chapter: 'Chapter II - Of the Specific Performance of Contracts',
    full_text: 'Section 12 Specific Relief Act 1877: Cases in which specific performance enforceable. Except as otherwise provided in this Chapter, the specific performance of any contract may in the discretion of the Court be enforced: (a) when the act agreed to be done is in the performance of a trust; (b) when there exists no standard for ascertaining the actual damage caused by the non-performance of the act; (c) when the act agreed to be done is such that pecuniary compensation for its non-performance would not afford adequate relief (presumed in agreements to transfer immovable property).'
  },
  {
    source_type: 'statute',
    statute_name: 'Specific Relief Act',
    article_or_section: 'Section 54',
    title: 'Perpetual Injunctions when granted',
    chapter: 'Chapter X - Of Injunctions Generally',
    full_text: 'Section 54 Specific Relief Act 1877: Perpetual injunction when granted. A perpetual injunction may be granted to prevent the breach of an obligation existing in favor of the applicant, whether expressly or by implication. When the defendant invades or threatens to invade the plaintiff\'s right to, or enjoyment of, property, the Court may grant a perpetual injunction where defendant is trustee, where no standard exists for damages, or where injunction is necessary to prevent a multiplicity of judicial proceedings.'
  },
  {
    source_type: 'statute',
    statute_name: 'Specific Relief Act',
    article_or_section: 'Section 39',
    title: 'When cancellation of instrument may be ordered',
    chapter: 'Chapter V - Of the Cancellation of Instruments',
    full_text: 'Section 39 Specific Relief Act 1877: When cancellation may be ordered. Any person against whom a written instrument is void or voidable, who has reasonable apprehension that such instrument, if left outstanding, may cause him serious injury, may sue to have it adjudged void or voidable; and the Court may, in its discretion, so adjudge it and order it to be delivered up and cancelled.'
  },

  // --- CONTRACT ACT 1872 ---
  {
    source_type: 'statute',
    statute_name: 'Contract Act',
    article_or_section: 'Section 10',
    title: 'What agreements are contracts',
    chapter: 'Chapter II - Of Contracts, Voidable Contracts and Void Agreements',
    full_text: 'Section 10 Contract Act 1872: What agreements are contracts. All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void.'
  },
  {
    source_type: 'statute',
    statute_name: 'Contract Act',
    article_or_section: 'Section 56',
    title: 'Agreement to do impossible act (Doctrine of Frustration)',
    chapter: 'Chapter IV - Of the Performance of Contracts',
    full_text: 'Section 56 Contract Act 1872: Agreement to do impossible act. An agreement to do an act impossible in itself is void. A contract to do an act which, after the contract is made, becomes impossible, or, by reason of some event which the promisor could not prevent, unlawful, becomes void when the act becomes impossible or unlawful (Doctrine of Frustration).'
  },
  {
    source_type: 'statute',
    statute_name: 'Contract Act',
    article_or_section: 'Section 73',
    title: 'Compensation for loss or damage caused by breach of contract',
    chapter: 'Chapter VI - Of the Consequences of Breach of Contract',
    full_text: 'Section 73 Contract Act 1872: Compensation for breach of contract. When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it.'
  },

  // --- LIMITATION ACT 1908 ---
  {
    source_type: 'statute',
    statute_name: 'Limitation Act',
    article_or_section: 'Section 5',
    title: 'Extension of period in certain cases (Condonation of Delay)',
    chapter: 'Part II - Limitation of Suits, Appeals and Applications',
    full_text: 'Section 5 Limitation Act 1908: Extension of period in certain cases. Any appeal or application for a revision or a review of judgment or for leave to appeal or any other application to which this section may be made applicable by or under any enactment for the time being in force may be admitted after the period of limitation prescribed therefor, when the appellant or applicant satisfies the Court that he had sufficient cause for not preferring the appeal or making the application within such period. Note: Section 5 does NOT apply to institution of original civil suits.'
  },
  {
    source_type: 'statute',
    statute_name: 'Limitation Act',
    article_or_section: 'Section 12',
    title: 'Exclusion of time in legal proceedings (Copying period)',
    chapter: 'Part III - Computation of Period of Limitation',
    full_text: 'Section 12 Limitation Act 1908: Exclusion of time in legal proceedings. (1) In computing the period of limitation prescribed for any suit, appeal or application, the day from which such period is to be reckoned shall be excluded. (2) In computing the period of limitation for an appeal, or an application for review of a judgment, the day on which the judgment complained of was pronounced, and the time requisite for obtaining a copy of the decree, sentence or order appealed from, shall be excluded.'
  },

  // --- WEST PAKISTAN FAMILY COURTS ACT 1964 ---
  {
    source_type: 'statute',
    statute_name: 'Family Courts Act',
    article_or_section: 'Section 5',
    title: 'Jurisdiction of Family Courts (Schedule Matters)',
    chapter: 'Section 5 & Schedule',
    full_text: 'Section 5 Family Courts Act 1964: Jurisdiction. Subject to the provisions of the Muslim Family Laws Ordinance, 1961, and the Conciliation Courts Ordinance, 1961, the Family Courts shall have exclusive jurisdiction to entertain, hear and adjudicate upon matters specified in Part I of the Schedule: (1) Dissolution of marriage including Khula; (2) Dower; (3) Maintenance; (4) Restitution of conjugal rights; (5) Custody of children and visitation rights of parents; (6) Guardianship; (7) Jactitation of marriage; (8) Dowry articles and personal property of wife.'
  },
  {
    source_type: 'statute',
    statute_name: 'Family Courts Act',
    article_or_section: 'Section 10',
    title: 'Pre-trial proceedings and reconciliation',
    chapter: 'Procedure',
    full_text: 'Section 10 Family Courts Act 1964: Pre-trial proceedings. When the written statement is filed, the Court shall fix an early date for a pre-trial hearing. At the pre-trial hearing, the Court shall examine the plaint, the written statement and documents, and ascertain the points at issue, and endeavor to effect a compromise or reconciliation between the parties. In suit for dissolution of marriage by Khula, if reconciliation fails, the Family Court shall immediately pass a decree for dissolution of marriage.'
  },

  // --- GUARDIANS AND WARDS ACT 1890 ---
  {
    source_type: 'statute',
    statute_name: 'Guardians and Wards Act',
    article_or_section: 'Section 17',
    title: 'Matters to be considered by the Court in appointing guardian',
    chapter: 'Chapter II - Appointment and Declaration of Guardians',
    full_text: 'Section 17 Guardians and Wards Act 1890: Matters to be considered by the Court in appointing guardian. (1) In appointing or declaring the guardian of a minor, the Court shall, subject to the provisions of this section, be guided by what, consistently with the law to which the minor is subject, appears in the circumstances to be for the welfare of the minor (Paramount consideration). (2) In considering what will be for the welfare of the minor, the Court shall have regard to the age, sex and religion of the minor, the character and capacity of the proposed guardian and his nearness of kin to the minor, the wishes, if any, of a deceased parent, and any existing or previous relations of the proposed guardian with the minor or his property.'
  },

  // --- CONTROL OF NARCOTIC SUBSTANCES ACT 1997 (CNSA) ---
  {
    source_type: 'statute',
    statute_name: 'CNSA',
    article_or_section: 'Section 9',
    title: 'Punishment for contravention in relation to narcotic drugs (Charas, Heroin, Ice)',
    chapter: 'Chapter II - Offences and Penalties',
    full_text: 'Section 9 CNSA 1997: Punishment for contravention in relation to narcotic drugs. (a) Imprisonment up to two years or fine or both if quantity does not exceed 100 grams; (b) Imprisonment up to seven years and fine if quantity exceeds 100 grams but does not exceed one kilogram; (c) Death or imprisonment for life, or imprisonment which shall not be less than fourteen years and fine up to one million rupees, if the quantity exceeds one kilogram. Section 51 bars bail where quantity exceeds non-commercial threshold unless reasonable grounds exist to believe accused is not guilty.'
  },

  // --- PREVENTION OF ELECTRONIC CRIMES ACT 2016 (PECA) ---
  {
    source_type: 'statute',
    statute_name: 'PECA',
    article_or_section: 'Section 20',
    title: 'Offences against dignity of a natural person (Cyber Harassment & Defamation)',
    chapter: 'Chapter II - Offences and Penalties',
    full_text: 'Section 20 PECA 2016: Offences against dignity of a natural person. Whoever intentionally and publicly exhibits or displays or transmits any information through any information system, which he knows to be false, and intimidates or harms the reputation or privacy of a natural person, shall be punished with imprisonment for a term which may extend to three years or with fine which may extend to one million rupees or with both.'
  },

  // --- LANDMARK JUDGMENTS & PRECEDENTS ---
  {
    source_type: 'judgment',
    citation: 'PLD 1995 SC 34',
    title: 'Tariq Bashir v. The State - Principles Governing Grant of Bail',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Saleem Akhtar, J.',
    year: 1995,
    ratio_decidendi: 'Grant of bail in offences not falling within the prohibitory clause of Section 497(1) CrPC is a rule, and refusal is an exception. In non-prohibitory clause offences, bail cannot be withheld as a punishment.',
    full_text: 'PLD 1995 Supreme Court 34: Tariq Bashir and others v. The State. (Bail in Non-Bailable Offences). Held: In offences not falling within the prohibitory clause of Section 497(1) CrPC (offences punishable with less than ten years imprisonment), the grant of bail is a rule and refusal is an exception. Refusal is justified only in exceptional circumstances, such as: (a) where there is a danger of accused absconding; (b) danger of tampering with evidence; (c) repeat offender likely to commit similar offence.'
  },
  {
    source_type: 'judgment',
    citation: 'PLD 2014 SC 458',
    title: 'Muhammad Shakeel v. The State - Principles for Pre-Arrest Bail',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Asif Saeed Khan Khosa, J.',
    year: 2014,
    ratio_decidendi: 'Pre-arrest bail under Section 498 CrPC requires proof of mala fide, ulterior motive, and harassment on the part of police or complainant.',
    full_text: 'PLD 2014 Supreme Court 458: Muhammad Shakeel v. The State. Pre-arrest bail is an extraordinary remedy. The essential conditions for grant of pre-arrest bail are: (1) genuine apprehension of imminent arrest; (2) mala fide, ulterior motive or harassment on the part of the complainant or police; (3) irreparable loss or humiliation to the reputation of the petitioner if arrested.'
  },
  {
    source_type: 'judgment',
    citation: '2013 SCMR 51',
    title: 'Mian Allah Ditta v. The State - Dishonour of Cheque Section 489-F PPC',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Jawwad S. Khawaja, J.',
    year: 2013,
    ratio_decidendi: 'Ingredients of Section 489-F PPC require dishonest intention at the time of cheque issuance towards repayment of loan or fulfillment of obligation.',
    full_text: '2013 SCMR 51: Mian Allah Ditta v. The State. (Dishonour of Cheque under Section 489-F PPC). Held: To constitute an offence under Section 489-F PPC, the prosecution must prove: (1) Cheque was issued with dishonest intention; (2) Issuance was towards repayment of a loan or fulfillment of an existing obligation; (3) Cheque was dishonoured on presentation at bank. If the cheque was issued merely as security or guarantee without existing debt, Section 489-F PPC is not attracted.'
  },
  {
    source_type: 'judgment',
    citation: 'PLD 1967 SC 97',
    title: 'Mst. Khurshid Bibi v. Baboo Muhammad Amin - Right of Khula in Islamic Law',
    court: 'Supreme Court of Pakistan',
    judge_name: 'S.A. Rahman, J.',
    year: 1967,
    ratio_decidendi: 'Wife is entitled to dissolution of marriage on grounds of Khula as of right if she cannot live with husband within the limits ordained by Allah, subject to returning benefits received.',
    full_text: 'PLD 1967 Supreme Court 97: Mst. Khurshid Bibi v. Baboo Muhammad Amin. (Landmark Full Bench judgment on Khula). Held: A Muslim wife has an unconditional right to seek dissolution of marriage through Khula if she has developed deep hatred or aversion towards husband and cannot live with him within the limits prescribed by Allah. Consent of husband is not mandatory; Court can grant Khula decree upon wife relinquishing or returning the dower / benefits received.'
  },
  {
    source_type: 'judgment',
    citation: '2020 SCMR 1099',
    title: 'Nasreen Bibi v. Muhammad Farooq - Obligation of Father for Child Maintenance',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Mushir Alam, J.',
    year: 2020,
    ratio_decidendi: 'Father has absolute legal and religious obligation to maintain his minor children regardless of whether custody is with mother or father is unemployed.',
    full_text: '2020 SCMR 1099: Nasreen Bibi v. Muhammad Farooq. Maintenance of minor children is the statutory, moral, and religious duty of the father. Even if the mother has custody or the father claims to be without employment, the father cannot escape his liability to pay reasonable maintenance according to his social status and inflation.'
  }
];

async function populateData() {
  console.log('=== Populating Advanced Pakistani Legal Data into Supabase Database ===');
  let inserted = 0;
  let skipped = 0;

  for (const item of legalDataset) {
    try {
      const existing = await query(
        'SELECT id FROM legal_knowledge WHERE (article_or_section = $1 AND statute_name = $2) OR (citation = $3 AND citation IS NOT NULL)',
        [item.article_or_section || null, item.statute_name || null, item.citation || null]
      );

      if (existing.rows.length > 0) {
        console.log('[SKIP] Already present: ' + (item.statute_name || item.citation) + ' - ' + (item.article_or_section || item.title));
        skipped++;
        continue;
      }

      await query(
        'INSERT INTO legal_knowledge (source_type, title, citation, court, judge_name, year, chapter, article_or_section, statute_name, full_text, ratio_decidendi, metadata) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [
          item.source_type,
          item.title,
          item.citation || null,
          item.court || null,
          item.judge_name || null,
          item.year || null,
          item.chapter || null,
          item.article_or_section || null,
          item.statute_name || null,
          item.full_text,
          item.ratio_decidendi || null,
          JSON.stringify({ populated_by: 'advanced_legal_pipeline', date: new Date().toISOString() })
        ]
      );

      console.log('[INSERTED] ' + (item.statute_name || item.citation) + ' - ' + (item.article_or_section || item.title));
      inserted++;
    } catch (err) {
      console.error('[ERROR] Failed to insert ' + item.title + ':', err.message);
    }
  }

  console.log('\n=== Population Summary: ' + inserted + ' inserted, ' + skipped + ' skipped ===');
  await pool.end();
}

populateData();
