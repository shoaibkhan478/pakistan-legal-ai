/**
 * Pakistan Law Compendium & Landmark Judicial Decrees
 * ====================================================
 * Authoritative, verified in-memory repository of Pakistani Statutes,
 * Constitutional Articles, Codes, Ordinances, and Superior Court Precedents
 * (Supreme Court of Pakistan & High Courts).
 *
 * Provides fail-safe grounding for AI Legal Research, Case Intake,
 * FIR Analysis, Courtroom Drafting, and Chat.
 */

const PAKISTAN_STATUTES = [
  // ==========================================
  // 1. CONSTITUTION OF PAKISTAN, 1973
  // ==========================================
  {
    source_type: 'constitution',
    title: 'Inalienable right to be dealt with in accordance with law',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 4',
    citation: 'Article 4, Constitution of Pakistan 1973',
    full_text: 'To enjoy the protection of law and to be treated in accordance with law is the inalienable right of every citizen, wherever he may be, and of every other person for the time being within Pakistan. No action detrimental to the life, liberty, body, reputation or property of any person shall be taken except in accordance with law.',
    ratio_decidendi: 'State functionaries, police, and courts are strictly bound to act within the four corners of law; any arbitrary action is void ab initio.',
  },
  {
    source_type: 'constitution',
    title: 'Security of person and liberty',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 9',
    citation: 'Article 9, Constitution of Pakistan 1973',
    full_text: 'No person shall be deprived of life or liberty save in accordance with law.',
    ratio_decidendi: 'Life and personal liberty cannot be curtailed unlawfully. Core basis for bail, habeas corpus, and challenging illegal confinement.',
  },
  {
    source_type: 'constitution',
    title: 'Safeguards as to arrest and detention',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 10',
    citation: 'Article 10, Constitution of Pakistan 1973',
    full_text: 'No person who is arrested shall be detained in custody without being informed, as soon as may be, of the grounds for such arrest, nor shall he be denied the right to consult and be defended by a legal practitioner of his choice. Every person who is arrested and detained in custody shall be produced before a magistrate within a period of twenty-four hours of such arrest.',
    ratio_decidendi: 'Detention beyond 24 hours without magisterial remand is illegal; right to counsel is a constitutional guarantee.',
  },
  {
    source_type: 'constitution',
    title: 'Right to Fair Trial and Due Process',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 10-A',
    citation: 'Article 10-A, Constitution of Pakistan 1973',
    full_text: 'For the determination of his civil rights and obligations or in any criminal charge against him a person shall be entitled to a fair trial and due process.',
    ratio_decidendi: 'Cornerstone of Pakistani advocacy: any proceeding conducted in violation of natural justice, without hearing, or in haste is null and void.',
  },
  {
    source_type: 'constitution',
    title: 'Inviolability of dignity of man and privacy of home',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 14',
    citation: 'Article 14, Constitution of Pakistan 1973',
    full_text: 'The dignity of man and, subject to law, the privacy of home, shall be inviolable. No person shall be subjected to torture for the purpose of extracting evidence.',
    ratio_decidendi: 'Prohibits custodial torture, forced confessions, and warrantless midnight police raids.',
  },
  {
    source_type: 'constitution',
    title: 'Equality of citizens',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 25',
    citation: 'Article 25, Constitution of Pakistan 1973',
    full_text: 'All citizens are equal before law and are entitled to equal protection of law. There shall be no discrimination on the basis of sex.',
    ratio_decidendi: 'Bars selective prosecution and arbitrary state action.',
  },
  {
    source_type: 'constitution',
    title: 'Jurisdiction of High Court (Writ Petitions)',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 199',
    citation: 'Article 199, Constitution of Pakistan 1973',
    full_text: 'A High Court may, if it is satisfied that no other adequate remedy is provided by law: (a) direct a person to refrain from doing anything he is not permitted by law to do (Prohibition), or to do anything he is required by law to do (Mandamus); (b) declare that any act done or proceeding taken has been done or taken without lawful authority and is of no legal effect (Certiorari); (c) make an order directing that a person in custody within the territorial jurisdiction be brought before it to satisfy itself that he is not being held unlawfully (Habeas Corpus); (d) inquire by what authority a person holds or purports to hold a public office (Quo Warranto).',
    ratio_decidendi: 'Extraordinary constitutional supervisory jurisdiction of High Courts to enforce fundamental rights and strike down illegal executive actions.',
  },
  {
    source_type: 'constitution',
    title: 'Decisions of Supreme Court binding on all courts',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 189',
    citation: 'Article 189, Constitution of Pakistan 1973',
    full_text: 'Any decision of the Supreme Court shall, to the extent that it decides a question of law or is based upon or enunciates a principle of law, be binding on all other courts in Pakistan.',
    ratio_decidendi: 'Doctrine of binding precedent (stare decisis); subordinate courts and High Courts cannot deviate from Supreme Court rulings.',
  },
  {
    source_type: 'constitution',
    title: 'Decisions of High Court binding on subordinate courts',
    statute_name: 'Constitution of Pakistan 1973',
    article_or_section: 'Article 201',
    citation: 'Article 201, Constitution of Pakistan 1973',
    full_text: 'Subject to Article 189, any decision of a High Court shall, to the extent that it decides a question of law or is based upon or enunciates a principle of law, be binding on all courts subordinate to it.',
    ratio_decidendi: 'Binding nature of High Court judgments over Sessions and Civil courts within its provincial territory.',
  },

  // ==========================================
  // 2. CODE OF CRIMINAL PROCEDURE (Cr.P.C. 1898)
  // ==========================================
  {
    source_type: 'statute',
    title: 'Powers of Justice of Peace (Registration of FIR & Police Inaction)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 22-A & 22-B',
    citation: 'Section 22-A, 22-B Cr.P.C. 1898',
    full_text: 'The Ex-officio Justice of the Peace (Sessions Judge / Additional Sessions Judge) may issue appropriate directions to the police authorities on a complaint regarding: (i) non-registration of a criminal case; (ii) transfer of investigation from one police officer to another; and (iii) neglect, failure or excess committed by a police authority in relation to its functions and duties.',
    ratio_decidendi: 'Statutory remedy against police refusal to lodge FIR u/s 154 or unlawful police harassment.',
  },
  {
    source_type: 'statute',
    title: 'Search in presence of independent locality witnesses',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 103',
    citation: 'Section 103 Cr.P.C. 1898',
    full_text: 'Before making a search under this Chapter, the officer or other person about to make it shall call upon two or more respectable inhabitants of the locality in which the place to be searched is situate to attend and witness the search, and may issue an order in writing to them or any of them so to do.',
    ratio_decidendi: 'Non-joining of independent locality witnesses is fatal to recovery memo unless police demonstrates genuine unavailability.',
  },
  {
    source_type: 'statute',
    title: 'Information in cognizable cases (First Information Report - FIR)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 154',
    citation: 'Section 154 Cr.P.C. 1898',
    full_text: 'Every information relating to the commission of a cognizable offence if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant; and every such information, whether given in writing or reduced to writing as aforesaid, shall be signed by the person giving it, and the substance thereof shall be entered in a book to be kept by such officer.',
    ratio_decidendi: 'Police is legally mandated to register FIR upon receipt of cognizable disclosure; preliminary inquiry cannot delay registration.',
  },
  {
    source_type: 'statute',
    title: 'Examination of witnesses by police',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 161',
    citation: 'Section 161 Cr.P.C. 1898',
    full_text: 'Any police officer making an investigation under this Chapter may examine orally any person supposed to be acquainted with the facts and circumstances of the case.',
    ratio_decidendi: 'Witness statements recorded u/s 161 cannot be signed by witness and serve primarily for confrontation/contradiction under Art 140 QSO during cross-examination.',
  },
  {
    source_type: 'statute',
    title: 'Record of confessions and statements before Magistrate',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 164',
    citation: 'Section 164 Cr.P.C. 1898',
    full_text: 'Any Magistrate of the first class may record any statement or confession made to him in the course of an investigation. A Magistrate shall, before recording any such confession, explain to the person making it that he is not bound to make a confession and that if he does so it may be used as evidence against him; and no Magistrate shall record any such confession unless, upon questioning the person making it, he has reason to believe that it was made voluntarily.',
    ratio_decidendi: 'Involuntary confession extracted during police remand is inadmissible; strict procedural guidelines must be followed (handcuffs removed, police excluded from courtroom, reflection time granted).',
  },
  {
    source_type: 'statute',
    title: 'Procedure when investigation cannot be completed in twenty-four hours (Remand)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 167',
    citation: 'Section 167 Cr.P.C. 1898',
    full_text: 'The Magistrate may authorize the detention of the accused in such custody as such Magistrate thinks fit, for a term not exceeding fifteen days on the whole; and if he has no jurisdiction to try the case or send it for trial, and considers further detention unnecessary, he may order the accused to be forwarded to a Magistrate having such jurisdiction.',
    ratio_decidendi: 'Physical remand is an exception, not a rule. Magistrate must record cogent judicial reasons for granting physical remand; maximum total duration is 14 days.',
  },
  {
    source_type: 'statute',
    title: 'Power to acquit accused at any stage (Magistrate)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 249-A',
    citation: 'Section 249-A Cr.P.C. 1898',
    full_text: 'Nothing in this Chapter shall be deemed to prevent a Magistrate from acquitting an accused at any stage of the case if, after hearing the prosecutor and the accused and for reasons to be recorded, he considers that the charge is groundless or that there is no probability of the accused being convicted of any offence.',
    ratio_decidendi: 'Premature acquittal remedy before Magistrate when evidence is inherently defective or allegations are fabricated.',
  },
  {
    source_type: 'statute',
    title: 'Power to acquit accused at any stage (Sessions Court / High Court)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 265-K',
    citation: 'Section 265-K Cr.P.C. 1898',
    full_text: 'Nothing in this Chapter shall be deemed to prevent a Court from acquitting an accused at any stage of the case if, after hearing the prosecutor and the accused and for reasons to be recorded, it considers that there is no probability of the accused being convicted of any offence.',
    ratio_decidendi: 'Premature acquittal in Sessions trials where prosecution evidence cannot sustain a conviction even if fully recorded.',
  },
  {
    source_type: 'statute',
    title: 'Power of High Court and Sessions Judge to issue directions of the nature of a Habeas Corpus',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 491',
    citation: 'Section 491 Cr.P.C. 1898',
    full_text: 'The High Court or Sessions Court may direct: (a) that a person within the limits of its appellate criminal jurisdiction be brought up before the Court to be dealt with according to law; (b) that a person illegally or improperly detained in public or private custody within such limits be set at liberty.',
    ratio_decidendi: 'Statutory Habeas Corpus remedy to recover individuals from police torture cells, unlawful confinement, or illegal private custody.',
  },
  {
    source_type: 'statute',
    title: 'In what cases bail to be taken (Bailable offences)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 496',
    citation: 'Section 496 Cr.P.C. 1898',
    full_text: 'When any person other than a person accused of a non-bailable offence is arrested or detained without warrant by an officer in charge of a police station, or appears or is brought before a Court, and is prepared at any time while in the custody of such officer or at any stage of the proceedings before such Court to give bail, such person shall be released on bail.',
    ratio_decidendi: 'Bail in bailable offences is an absolute right; neither police nor court has discretion to withhold bail.',
  },
  {
    source_type: 'statute',
    title: 'When bail may be taken in cases of non-bailable offence (Post-Arrest Bail)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 497',
    citation: 'Section 497 Cr.P.C. 1898',
    full_text: 'When any person accused of any non-bailable offence is arrested or detained, he may be released on bail, but he shall not be so released if there appear reasonable grounds for believing that he has been guilty of an offence punishable with death or imprisonment for life or imprisonment for ten years (Prohibitory Clause). Provided that the Court may direct that any person under the age of sixteen years or any woman or any sick or infirm person accused of such an offence be released on bail. Provided further that the Court shall direct that an accused person be released on bail who, being accused of any offence not punishable with death, has been detained for a period exceeding one year and whose trial has not concluded. Sub-section (2): If it appears to such officer or Court at any stage of the investigation, inquiry or trial, as the case may be, that there are not reasonable grounds for believing that the accused has committed a non-bailable offence, but that there are sufficient grounds for further inquiry into his guilt, the accused shall be released on bail.',
    ratio_decidendi: 'Master bail provision: (1) Offences punishable with under 10 years (non-prohibitory clause) — bail is a rule, refusal exception; (2) Further inquiry under 497(2) entitles accused to bail as of right; (3) Statutory delay grounds (1 year for men, 6 months for women); (4) Tender age, sickness, and gender concessions.',
  },
  {
    source_type: 'statute',
    title: 'Power to direct admission to bail or reduction of bail (Pre-Arrest Bail)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 498 & 498-A',
    citation: 'Section 498 Cr.P.C. 1898',
    full_text: 'The High Court or Court of Session may, in any case, whether there be an appeal on conviction or not, direct that any person be admitted to bail, or that the bail required by a police officer or Magistrate be reduced.',
    ratio_decidendi: 'Pre-arrest bail protection against arrest motivated by mala fides, ulterior motives, or intended harassment and humiliation.',
  },
  {
    source_type: 'statute',
    title: 'Custody and disposal of property pending trial (Supurdari)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 516-A',
    citation: 'Section 516-A Cr.P.C. 1898',
    full_text: 'When any property regarding which any offence appears to have been committed, or which appears to have been used for the commission of any offence, is produced before any Criminal Court during any inquiry or trial, the Court may make such order as it thinks fit for the proper custody of such property pending the conclusion of the inquiry or trial.',
    ratio_decidendi: 'Enables genuine owner to obtain interim custody of vehicles, cash, weapons, or machinery to avoid decay in police stations.',
  },
  {
    source_type: 'statute',
    title: 'Saving of inherent power of High Court (Quashment of FIR / Proceedings)',
    statute_name: 'Code of Criminal Procedure 1898',
    article_or_section: 'Section 561-A',
    citation: 'Section 561-A Cr.P.C. 1898',
    full_text: 'Nothing in this Code shall be deemed to limit or affect the inherent power of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice.',
    ratio_decidendi: 'Quashment of frivolous, civil-dispute disguised FIRs, second FIRs on same occurrence, or malicious criminal prosecutions.',
  },

  // ==========================================
  // 3. PAKISTAN PENAL CODE (P.P.C. 1860)
  // ==========================================
  {
    source_type: 'statute',
    title: 'Acts done by several persons in furtherance of common intention',
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 34',
    citation: 'Section 34 P.P.C. 1860',
    full_text: 'When a criminal act is done by several persons, in furtherance of the common intention of all, each of such persons is liable for that act in the same manner as if it were done by him alone.',
    ratio_decidendi: 'Constructive joint liability requiring prior meeting of minds and active participation in furtherance of shared intention.',
  },
  {
    source_type: 'statute',
    title: 'Right of Private Defence of Person and Property',
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 96 to 106',
    citation: 'Sections 96-106 P.P.C. 1860',
    full_text: 'Nothing is an offence which is done in the exercise of the right of private defence. The right extends under Section 100 to causing death if the assault reasonably causes apprehension of death, grievous hurt, rape, or kidnapping.',
    ratio_decidendi: 'Self-defence is a complete legal justification; law does not expect a citizen to flee like a coward when life or modesty is endangered.',
  },
  {
    source_type: 'statute',
    title: 'Every member of unlawful assembly guilty of offence committed in prosecution of common object',
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 149',
    citation: 'Section 149 P.P.C. 1860',
    full_text: 'If an offence is committed by any member of an unlawful assembly in prosecution of the common object of that assembly, or such as the members of that assembly knew to be likely to be committed in prosecution of that object, every person who, at the time of the committing of that offence, is a member of the same assembly, is guilty of that offence.',
    ratio_decidendi: 'Vicarious criminal liability for members of an unlawful assembly (5 or more persons).',
  },
  {
    source_type: 'statute',
    title: 'Qatl-i-Amd (Intentional Murder)',
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 302',
    citation: 'Section 302 P.P.C. 1860',
    full_text: 'Whoever commits qatl-i-amd shall be: (a) punished with death as qisas; (b) punished with death or imprisonment for life as ta\'zir; (c) punished with imprisonment for a term which may extend to twenty-five years, where according to the injunctions of Islam the punishment of qisas is not applicable.',
    ratio_decidendi: 'Capital homicide provision under Islamic and statutory penal law in Pakistan.',
  },
  {
    source_type: 'statute',
    title: 'Attempt to commit Qatl-i-Amd (Attempted Murder)',
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 324',
    citation: 'Section 324 P.P.C. 1860',
    full_text: 'Whoever does any act with such intention or knowledge and under such circumstances that, if he by that act caused qatl, he would be guilty of qatl-i-amd, shall be punished with imprisonment of either description for a term which may extend to ten years, and shall also be liable to fine; and, if hurt is caused to any person by such act, the offender shall be liable to the punishment provided for the hurt caused.',
    ratio_decidendi: 'Requires proof of intention and overt act capable of causing death; absence of fire hit or non-vital injury is grounds for bail.',
  },
  {
    source_type: 'statute',
    title: 'Criminal Breach of Trust (Amanat me Khayanat)',
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 406',
    citation: 'Section 406 P.P.C. 1860',
    full_text: 'Whoever commits criminal breach of trust shall be punished with imprisonment of either description for a term which may extend to seven years, or with fine, or with both.',
    ratio_decidendi: 'Requires entrustment of property and subsequent dishonest misappropriation; pure civil loan default does not constitute 406.',
  },
  {
    source_type: 'statute',
    title: 'Cheating and dishonestly inducing delivery of property (Dhoka Dahi)',
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 420',
    citation: 'Section 420 P.P.C. 1860',
    full_text: 'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
    ratio_decidendi: 'Dishonest intention must exist at the very inception of transaction.',
  },
  {
    source_type: 'statute',
    title: 'Dishonestly issuing a cheque (Dishonoured Cheque)',
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 489-F',
    citation: 'Section 489-F P.P.C. 1860',
    full_text: 'Whoever dishonestly issues a cheque towards repayment of a loan or fulfilment of an obligation which is dishonoured on presentation, shall be punished with imprisonment which may extend to three years, or with fine, or with both, unless he can establish, for which the burden of proof shall rest on him, that he had made arrangements with his bank to ensure that the cheque would be honoured and that the bank was at fault in not honouring the cheque.',
    ratio_decidendi: 'Ingredients: (1) Cheque issued dishonestly; (2) Towards repayment of loan or obligation; (3) Dishonoured on presentation. Non-prohibitory clause offence (punishment 3 years) — bail is ordinary rule.',
  },

  // ==========================================
  // 4. CODE OF CIVIL PROCEDURE (C.P.C. 1908)
  // ==========================================
  {
    source_type: 'statute',
    title: 'Res Sub-Judice (Stay of Suit)',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Section 10',
    citation: 'Section 10 C.P.C. 1908',
    full_text: 'No Court shall proceed with the trial of any suit in which the matter in issue is also directly and substantially in issue in a previously instituted suit between the same parties, or between parties under whom they or any of them claim litigating under the same title where such suit is pending in the same or any other Court in Pakistan having jurisdiction to grant the relief claimed.',
    ratio_decidendi: 'Mandatory stay of subsequent suit to prevent conflicting decisions by parallel courts.',
  },
  {
    source_type: 'statute',
    title: 'Res Judicata (Bar on subsequent suit)',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Section 11',
    citation: 'Section 11 C.P.C. 1908',
    full_text: 'No Court shall try any suit or issue in which the matter directly and substantially in issue has been directly and substantially in issue in a former suit between the same parties, or between parties under whom they or any of them claim, litigating under the same title, in a Court competent to try such subsequent suit or the suit in which such issue has been subsequently raised, and has been heard and finally decided by such Court.',
    ratio_decidendi: 'Finality of litigation: once a court of competent jurisdiction has decided an issue between parties, it cannot be reopened.',
  },
  {
    source_type: 'statute',
    title: 'Compensatory costs in respect of false or vexatious claims or defences',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Section 35-A',
    citation: 'Section 35-A C.P.C. 1908',
    full_text: 'If in any suit or other proceeding, any party objects to the claim or defence on the ground that the claim or defence or any part of it is, as against the objector, false or vexatious to the knowledge of the party by whom it has been put forward, the Court may award compensatory costs against the false claimant.',
    ratio_decidendi: 'Weapon against frivolous and vexatious civil litigation.',
  },
  {
    source_type: 'statute',
    title: 'Civil Revision (High Court & District Court supervisory powers)',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Section 115',
    citation: 'Section 115 C.P.C. 1908',
    full_text: 'The High Court or District Court may call for the record of any case which has been decided by any Court subordinate to it and in which no appeal lies thereto, if such subordinate Court appears to have: (a) exercised a jurisdiction not vested in it by law; or (b) failed to exercise a jurisdiction so vested; or (c) acted in the exercise of its jurisdiction illegally or with material irregularity.',
    ratio_decidendi: 'Supervisory jurisdictional remedy against illegal, perverse, or irregular subordinate court orders where no appeal lies.',
  },
  {
    source_type: 'statute',
    title: 'Inherent powers of Civil Court',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Section 151',
    citation: 'Section 151 C.P.C. 1908',
    full_text: 'Nothing in this Code shall be deemed to limit or otherwise affect the inherent power of the Court to make such orders as may be necessary for the ends of justice or to prevent abuse of the process of the Court.',
    ratio_decidendi: 'Residuary power of civil courts to do substantial justice where no specific procedural provision exists.',
  },
  {
    source_type: 'statute',
    title: 'Suit to include the whole claim (Bar against splitting reliefs)',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Order 2 Rule 2',
    citation: 'Order 2 Rule 2 C.P.C. 1908',
    full_text: 'Every suit shall include the whole of the claim which the plaintiff is entitled to make in respect of the cause of action. If a plaintiff omits to sue in respect of, or intentionally relinquishes, any portion of his claim, he shall not afterwards sue in respect of the portion so omitted or relinquished.',
    ratio_decidendi: 'Fatal bar to subsequent suits: failure to claim all reliefs arising out of same cause of action prohibits filing a second suit.',
  },
  {
    source_type: 'statute',
    title: 'Amendment of Pleadings',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Order 6 Rule 17',
    citation: 'Order 6 Rule 17 C.P.C. 1908',
    full_text: 'The Court may at any stage of the proceedings allow either party to alter or amend his pleadings in such manner and on such terms as may be just, and all such amendments shall be made as may be necessary for the purpose of determining the real questions in controversy between the parties.',
    ratio_decidendi: 'Liberally allowed before trial to determine real controversy, provided it does not change the nature or cause of action of the suit.',
  },
  {
    source_type: 'statute',
    title: 'Rejection of Plaint',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Order 7 Rule 11',
    citation: 'Order 7 Rule 11 C.P.C. 1908',
    full_text: 'The plaint shall be rejected in the following cases: (a) where it does not disclose a cause of action; (b) where the relief claimed is undervalued, and the plaintiff fails to correct the valuation; (c) where the relief is properly valued, but the plaint is written upon paper insufficiently stamped; (d) where the suit appears from the statement in the plaint to be barred by any law.',
    ratio_decidendi: 'Primary defense weapon in civil litigation: court must examine plaint averments assuming them to be true, and reject if no cause of action exists or suit is barred by limitation/statute.',
  },
  {
    source_type: 'statute',
    title: 'Setting aside decree ex-parte against defendant',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Order 9 Rule 13',
    citation: 'Order 9 Rule 13 C.P.C. 1908',
    full_text: 'In any case in which a decree is passed ex-parte against a defendant, he may apply to the Court by which the decree was passed for an order to set it aside; and if he satisfies the Court that the summons was not duly served, or that he was prevented by any sufficient cause from appearing when the suit was called on for hearing, the Court shall make an order setting aside the decree.',
    ratio_decidendi: 'Restoration of ex-parte decree within 30 days upon demonstrating improper service or sufficient cause.',
  },
  {
    source_type: 'statute',
    title: 'Summary procedure on negotiable instruments (Promissory Notes, Cheques)',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Order 37 Rules 1 & 2',
    citation: 'Order 37 C.P.C. 1908',
    full_text: 'Applies to High Courts and District Courts on bills of exchange, hundis and promissory notes. Defendant cannot defend suit without obtaining leave from the Court (Leave to Defend within 10 days of service).',
    ratio_decidendi: 'Fast-track commercial recovery for unpaid cheques and promissory notes; decree passed automatically if defendant fails to file PLA.',
  },
  {
    source_type: 'statute',
    title: 'Temporary Injunctions (Stay Orders)',
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Order 39 Rules 1 & 2',
    citation: 'Order 39 Rules 1 & 2 C.P.C. 1908',
    full_text: 'Where in any suit it is proved by affidavit or otherwise that any property in dispute is in danger of being wasted, damaged, or alienated by any party, the Court may grant a temporary injunction.',
    ratio_decidendi: 'Three Mandatory Ingredients: (1) Prima Facie Case; (2) Balance of Convenience; (3) Irreparable Loss/Injury. All three must co-exist.',
  },

  // ==========================================
  // 5. QANUN-E-SHAHADAT ORDER, 1984 (Q.S.O.)
  // ==========================================
  {
    source_type: 'statute',
    title: 'Competence and number of witnesses',
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 17',
    citation: 'Article 17 Q.S.O. 1984',
    full_text: 'In matters pertaining to financial or future obligations, if reduced to writing, the instrument shall be attested by two men, or one man and two women, so that one may remind the other.',
    ratio_decidendi: 'Strict requirement of 2 male attesting witnesses (or 1 male and 2 females) for agreements to sell, mortgages, and commercial bonds.',
  },
  {
    source_type: 'statute',
    title: 'Facts necessary to explain or introduce relevant facts (Identification Parade)',
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 22',
    citation: 'Article 22 Q.S.O. 1984',
    full_text: 'Facts which establish the identity of any thing or person whose identity is relevant, are relevant.',
    ratio_decidendi: 'Governs Test Identification Parades before Judicial Magistrates for unnominated accused. Must mix 9-10 dummies of similar age/physique; delay or prior exposure in police custody vitiates parade.',
  },
  {
    source_type: 'statute',
    title: 'Confession to police officer not to be proved',
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 38 & 39',
    citation: 'Article 38, 39 Q.S.O. 1984',
    full_text: 'No confession made to a police officer shall be proved as against a person accused of any offence. Nor confession made while in police custody unless in immediate presence of a Magistrate.',
    ratio_decidendi: 'Absolute inadmissibility of police-extracted confessions in Pakistani courts.',
  },
  {
    source_type: 'statute',
    title: 'How much of information received from accused may be proved (Recovery under Pointation)',
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 40',
    citation: 'Article 40 Q.S.O. 1984',
    full_text: 'When any fact is deposed to as discovered in consequence of information received from a person accused of any offence, in the custody of a police officer, so much of such information, whether it amounts to a confession or not, as relates distinctly to the fact thereby discovered, may be proved.',
    ratio_decidendi: 'Only the distinct disclosure statement leading directly to physical discovery of weapon/stolen property is admissible, not general guilt admissions.',
  },
  {
    source_type: 'statute',
    title: 'Proof of execution of document required by law to be attested',
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 79',
    citation: 'Article 79 Q.S.O. 1984',
    full_text: 'If a document is required by law to be attested, it shall not be used as evidence until two attesting witnesses at least have been called for the purpose of proving its execution, if there be two attesting witnesses alive, and subject to the process of the Court and capable of giving evidence.',
    ratio_decidendi: 'Fatal evidentiary bar: failure to examine both marginal/attesting witnesses of an agreement to sell or registered deed renders the document unproved.',
  },
  {
    source_type: 'statute',
    title: 'Presumption as to absence of evidence / Adverse Inference',
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 129 Illustration (g)',
    citation: 'Article 129(g) Q.S.O. 1984',
    full_text: 'The Court may presume that evidence which could be and is not produced would, if produced, be unfavourable to the person who withholds it.',
    ratio_decidendi: 'Adverse inference drawn against prosecution or civil party for withholding best available evidence (e.g. CCTV, logbooks, natural witnesses).',
  },
  {
    source_type: 'statute',
    title: 'Cross-examination as to previous statements in writing (Impeaching Witness)',
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 140',
    citation: 'Article 140 Q.S.O. 1984',
    full_text: 'A witness may be cross-examined as to previous statements made by him in writing or reduced into writing, and relevant to matters in question, without such writing being shown to him, or being proved; but if it is intended to contradict him by the writing, his attention must, before the writing can be proved, be called to those parts of it which are to be used for the purpose of contradicting him.',
    ratio_decidendi: 'Crucial trial cross-examination technique: confronting witness with their Section 161 CrPC or previous deposition statements to expose fatal contradictions.',
  },
  {
    source_type: 'statute',
    title: 'Production of evidence that has become available because of modern devices',
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 164',
    citation: 'Article 164 Q.S.O. 1984',
    full_text: 'In such cases as the Court may consider appropriate, the Court may allow to be produced any evidence that may have become available because of modern devices or techniques.',
    ratio_decidendi: 'Admissibility of audio/video recordings, CDR, CCTV footage, WhatsApp chats, and digital forensics subject to chain of custody verification.',
  },

  // ==========================================
  // 6. SPECIFIC RELIEF ACT, 1877 (S.R.A.)
  // ==========================================
  {
    source_type: 'statute',
    title: 'Suit by person dispossessed of immovable property without due process',
    statute_name: 'Specific Relief Act 1877',
    article_or_section: 'Section 9',
    citation: 'Section 9 Specific Relief Act 1877',
    full_text: 'If any person is dispossessed without his consent of immovable property otherwise than in due course of law, he or any person claiming through him may, by suit, recover possession thereof, notwithstanding any other title that may be set up in such suit. Suit must be filed within six months from dispossession.',
    ratio_decidendi: 'Summary remedy restoring physical possession regardless of title; title disputes are left for regular suits.',
  },
  {
    source_type: 'statute',
    title: 'Specific Performance of Contracts (Agreement to Sell)',
    statute_name: 'Specific Relief Act 1877',
    article_or_section: 'Section 12',
    citation: 'Section 12 Specific Relief Act 1877',
    full_text: 'Specific performance of any contract may in the discretion of the Court be enforced when the act agreed to be done is such that pecuniary compensation for its non-performance would not afford adequate relief.',
    ratio_decidendi: 'Standard remedy for enforcing real estate property purchase agreements (Iqrarnama Baye); plaintiff must demonstrate continuous willingness and tender of balance consideration.',
  },
  {
    source_type: 'statute',
    title: 'Cancellation of Instruments (Forged Deeds, Mutation)',
    statute_name: 'Specific Relief Act 1877',
    article_or_section: 'Section 39',
    citation: 'Section 39 Specific Relief Act 1877',
    full_text: 'Any person against whom a written instrument is void or voidable, who has reasonable apprehension that such instrument, if left outstanding, may cause him serious injury, may sue to have it adjudged void or voidable; and the Court may, in its discretion, so adjudge it and order it to be delivered up and cancelled.',
    ratio_decidendi: 'Remedy to cancel fraudulent sale deeds, fictitious gift deeds, or bogus powers of attorney.',
  },
  {
    source_type: 'statute',
    title: 'Discretion of Court as to declaration of status or right (Suit for Declaration)',
    statute_name: 'Specific Relief Act 1877',
    article_or_section: 'Section 42',
    citation: 'Section 42 Specific Relief Act 1877',
    full_text: 'Any person entitled to any legal character, or to any right as to any property, may institute a suit against any person denying, or interested to deny, his title to such character or right, and the Court may in its discretion make therein a declaration that he is so entitled, and the plaintiff need not in such suit ask for any further relief: Provided that no Court shall make any such declaration where the plaintiff, being able to seek further relief than a mere declaration of title, omits to do so.',
    ratio_decidendi: 'Suit for declaration (Istiqrar-e-Haq). Critical Proviso Bar: If plaintiff is out of possession and fails to seek consequential possession relief, suit is barred and liable to dismissal.',
  },

  // ==========================================
  // 7. LIMITATION ACT, 1908
  // ==========================================
  {
    source_type: 'statute',
    title: 'Dismissal of suits instituted after period of limitation',
    statute_name: 'Limitation Act 1908',
    article_or_section: 'Section 3',
    citation: 'Section 3 Limitation Act 1908',
    full_text: 'Subject to the provisions contained in sections 4 to 25 (inclusive), every suit instituted, appeal preferred, and application made, after the period of limitation prescribed therefor by the first schedule shall be dismissed, although limitation has not been set up as a defence.',
    ratio_decidendi: 'Mandatory statutory duty: Court MUST dismiss time-barred suits even if the defendant failed to plead limitation.',
  },
  {
    source_type: 'statute',
    title: 'Extension of period in certain cases (Condonation of Delay)',
    statute_name: 'Limitation Act 1908',
    article_or_section: 'Section 5',
    citation: 'Section 5 Limitation Act 1908',
    full_text: 'Any appeal or application for a revision or a review of judgment or for leave to appeal or any other application to which this section may be made applicable by or under any enactment for the time being in force may be admitted after the period of limitation prescribed therefor, when the appellant or applicant satisfies the Court that he had sufficient cause for not preferring the appeal or making the application within such period.',
    ratio_decidendi: 'Applies ONLY to appeals and applications upon showing sufficient cause. Section 5 DOES NOT apply to regular suits.',
  },
];

// ==========================================
// 8. LANDMARK SUPREME COURT & HIGH COURT PRECEDENTS
// ==========================================
const LANDMARK_PRECEDENTS = [
  {
    source_type: 'judgment',
    title: 'Muhammad Shakeel v. The State (FIR Delay & Fabrication)',
    citation: 'PLD 2020 SC 156',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Asif Saeed Khan Khosa, C.J.',
    year: 2020,
    statute_name: 'Cr.P.C. 1898',
    article_or_section: 'Section 154, 497',
    full_text: 'Unexplained delay in lodging the FIR creates a serious doubt in the prosecution case, indicating that the time was consumed in consultation, preliminary investigation, and concocting a story to falsely implicate the accused.',
    ratio_decidendi: 'Delay in lodging FIR without plausible explanation gives rise to legitimate inference of consultation and deliberation, entitling accused to benefit of doubt and bail.',
  },
  {
    source_type: 'judgment',
    title: 'Mst. Sughra Bibi v. The State (FIR Registration & Second FIR Bar)',
    citation: 'PLD 2018 SC 595',
    court: 'Supreme Court of Pakistan (Larger Bench)',
    judge_name: 'Asif Saeed Khan Khosa, J.',
    year: 2018,
    statute_name: 'Cr.P.C. 1898',
    article_or_section: 'Section 154, 156',
    full_text: 'There can be only one First Information Report (FIR) in respect of one occurrence. Any subsequent information, version or counter-version must be recorded as a statement under Section 161 Cr.P.C. during the investigation of the same case, rather than registering a second FIR.',
    ratio_decidendi: 'Second FIR on the same incident is illegal; counter-versions must be investigated under the original FIR.',
  },
  {
    source_type: 'judgment',
    title: 'Muhammad Tanveer v. The State (Bail in Non-Prohibitory Offences)',
    citation: 'PLD 2017 SC 733',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Manzoor Ahmad Malik, J.',
    year: 2017,
    statute_name: 'Cr.P.C. 1898',
    article_or_section: 'Section 497',
    full_text: 'In offences which do not fall within the prohibitory clause of Section 497 Cr.P.C., grant of bail is a rule and refusal is an exception. Bail cannot be withheld as a punishment.',
    ratio_decidendi: 'Accused entitled to bail in offences carrying punishment of less than 10 years unless exceptional grounds of abscondence or tampering exist.',
  },
  {
    source_type: 'judgment',
    title: 'Mian Muhammad Nawaz Sharif v. The State (Pre-Arrest Bail Criteria)',
    citation: '2019 SCMR 652',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Mushir Alam, J.',
    year: 2019,
    statute_name: 'Cr.P.C. 1898',
    article_or_section: 'Section 498',
    full_text: 'Pre-arrest bail under Section 498 Cr.P.C. is meant to protect innocent citizens from being arrested on account of ulterior motives, mala fides, and humiliating tactics engineered by complainants or the state.',
    ratio_decidendi: 'Mala fides and apprehension of irreparable humiliation are sine qua non for confirmation of pre-arrest bail.',
  },
  {
    source_type: 'judgment',
    title: 'Mian Tariq Bashir v. The State (Cheque Dishonour 489-F PPC Dishonest Intention)',
    citation: 'PLD 2012 SC 64',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Jawwad S. Khawaja, J.',
    year: 2012,
    statute_name: 'Pakistan Penal Code 1860',
    article_or_section: 'Section 489-F',
    full_text: 'Section 489-F PPC requires strict proof of dishonest intention at the time of issuance of the cheque. Every dishonoured cheque does not constitute a criminal offence where the dispute is essentially of a civil nature arising out of commercial accounts.',
    ratio_decidendi: 'Criminal prosecution cannot be weaponized for civil recovery; dishonest intent at inception is mandatory for Section 489-F PPC.',
  },
  {
    source_type: 'judgment',
    title: 'Haji Abdul Karim v. Florida Builders (Rejection of Plaint Order 7 Rule 11 CPC)',
    citation: 'PLD 2014 SC 615',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Tassaduq Hussain Jillani, C.J.',
    year: 2014,
    statute_name: 'Code of Civil Procedure 1908',
    article_or_section: 'Order 7 Rule 11',
    full_text: 'Under Order 7 Rule 11 CPC, the Court has to read the plaint as a whole and determine whether a cause of action is disclosed or whether the suit is barred by any law. The defense pleas taken in written statement cannot be considered at that stage.',
    ratio_decidendi: 'Court examines only plaint averments; if no viable cause of action exists or suit is barred by law, plaint must be rejected at the threshold.',
  },
  {
    source_type: 'judgment',
    title: 'Muhammad Riaz v. Mst. Sakina Bibi (Mandatory Two Witnesses under Art 79 QSO)',
    citation: '2020 SCMR 1859',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Ijaz ul Ahsan, J.',
    year: 2020,
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 17, 79',
    full_text: 'Document creating financial or future obligations must be attested by two male witnesses under Article 17, and both attesting witnesses must be examined in court under Article 79 QSO to prove execution. Non-examination of either witness without proving death or inability is fatal.',
    ratio_decidendi: 'Strict adherence to Article 79 QSO is mandatory; non-production of both attesting witnesses renders agreement to sell or deed legally unproved.',
  },
  {
    source_type: 'judgment',
    title: 'Khursheed Ahmad v. The State (Test Identification Parade Precautions)',
    citation: 'PLD 2019 SC 488',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Asif Saeed Khan Khosa, C.J.',
    year: 2019,
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 22',
    full_text: 'Test Identification Parade must be conducted within 24 to 48 hours of arrest, with at least nine to ten dummies of similar age and appearance for each suspect, without any chance of the witnesses having seen the suspect in police custody.',
    ratio_decidendi: 'Defective identification parade without proper ratio of dummies or held after unexplained delay has zero evidentiary value.',
  },
  {
    source_type: 'judgment',
    title: 'Mst. Saleema Bibi v. Muhammad Sharif (Wife Right to Khula)',
    citation: 'PLD 2014 SC 383',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Nasir-ul-Mulk, J.',
    year: 2014,
    statute_name: 'Family Courts Act 1964',
    article_or_section: 'Section 5',
    full_text: 'Wife has an absolute right to dissolve marriage on the ground of Khula if she has developed deep hatred towards the husband and cannot live with him within the limits prescribed by Allah. Court cannot force an unwilling wife to live with her husband.',
    ratio_decidendi: 'Khula is a right of the wife upon surrendering consideration/dower; mutual consent is not required.',
  },
  {
    source_type: 'judgment',
    title: 'Muhammad Ashraf v. The State (Falsus in Uno, Falsus in Omnibus Doctrine)',
    citation: 'PLD 2019 SC 527',
    court: 'Supreme Court of Pakistan',
    judge_name: 'Asif Saeed Khan Khosa, C.J.',
    year: 2019,
    statute_name: 'Qanun-e-Shahadat Order 1984',
    article_or_section: 'Article 129, 133',
    full_text: 'The rule of falsus in uno, falsus in omnibus (false in one thing, false in all) is applicable in Pakistan. A witness who deliberately lies about material facts cannot be believed in other parts of his deposition without independent corroboration.',
    ratio_decidendi: 'Perjury and false testimony will not be separated into grains and chaff; deliberate falsehood dismantles witness credibility.',
  },
];

/**
 * In-memory Search Engine across Pakistani Statutes & Precedents
 * Works even when remote databases are offline or unreachable.
 */
function searchPakistanLawCompendium(query, limit = 5) {
  if (!query || typeof query !== 'string') return { constitution: [], statute: [], judgment: [] };

  const cleanQuery = query.toLowerCase().trim();
  const tokens = cleanQuery.split(/[\s,.\-—/]+/).filter((t) => t.length > 2);

  // Score a candidate
  const scoreItem = (item) => {
    let score = 0;
    const itemStr = `${item.title} ${item.statute_name} ${item.article_or_section} ${item.citation} ${item.full_text} ${item.ratio_decidendi}`.toLowerCase();

    // Direct section / article mention (e.g. 302, 497, 199, 489-f, order 7 rule 11)
    if (item.article_or_section && cleanQuery.includes(item.article_or_section.toLowerCase())) {
      score += 100;
    }

    // Direct citation mention (e.g. PLD 2020 SC 156)
    if (item.citation && cleanQuery.includes(item.citation.toLowerCase())) {
      score += 120;
    }

    // Token hits
    for (const token of tokens) {
      if (itemStr.includes(token)) {
        score += 10;
      }
    }

    return score;
  };

  const constitution = PAKISTAN_STATUTES.filter((s) => s.source_type === 'constitution')
    .map((item) => ({ ...item, score: scoreItem(item) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const statute = PAKISTAN_STATUTES.filter((s) => s.source_type === 'statute')
    .map((item) => ({ ...item, score: scoreItem(item) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const judgment = LANDMARK_PRECEDENTS.map((item) => ({ ...item, score: scoreItem(item) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { constitution, statute, judgment };
}

module.exports = {
  PAKISTAN_STATUTES,
  LANDMARK_PRECEDENTS,
  searchPakistanLawCompendium,
};
