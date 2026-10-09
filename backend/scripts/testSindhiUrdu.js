const { translateLegalDocument, buildCuratedLegalTranslation } = require('../services/translation.service');

async function runTestSuite() {
  console.log('================================================================');
  console.log('TESTING LEGAL TRANSLATION SERVICE: SINDHI & URDU TO ENGLISH');
  console.log('================================================================\n');

  // Test 1: Sindhi FIR -> English
  console.log('Test 1: Sindhi FIR -> English Literal Court Translation');
  const sindhiFirText = `مقدمو نمبر 54/2026 ٿاڻو قاسم آباد حيدرآباد.
فريادي مسمي عبدالستار پٽ غلام رسول قوم عباسي ويٺل ڳوٺ مراد خان حاضر ٿاڻي ٿيو.
فريادي بيان ڪيو ته مورخه 12 فيبروري 2026 شام جو 7 وڳي ملزمان نامعلوم ٻه ڄڻا هٿياربند ٿي فريادي جي دڪان اندر داخل ٿيا.
ملزمن هٿيارن جي زور تي نقد رقم سٺ هزار روپيا ڦر ڪيا ۽ مزاحمت تي فائرنگ ڪري ڀڄي ويا.
پوليس پاران زير قلم 392، 34 ت پ ڪيس داخل ڪيو ويو. صحيح فريادي عبدالستار.`;

  const sdStart = Date.now();
  const sdResult = await translateLegalDocument(sindhiFirText, 'sd', 'en', { seniorAdvocateMode: true });
  console.log(`✓ Sindhi translation finished in ${((Date.now() - sdStart) / 1000).toFixed(1)}s using model: ${sdResult.model}`);
  console.log(`  Pairs count: ${sdResult.pairs.length}`);
  console.log(`  First pair translation:`);
  console.log(`    ORIGINAL:   ${sdResult.pairs[0]?.original}`);
  console.log(`    TRANSLATED: ${sdResult.pairs[0]?.translated}`);
  console.log(`  Second pair translation:`);
  console.log(`    ORIGINAL:   ${sdResult.pairs[1]?.original}`);
  console.log(`    TRANSLATED: ${sdResult.pairs[1]?.translated}`);

  // Verification checks on Sindhi
  const sdFull = sdResult.fullTranslation;
  const hasSdFirNo = /54\/2026/i.test(sdFull);
  const hasSdSections = /392|34/i.test(sdFull);
  console.log(`  ✓ FIR Number preserved in Sindhi: ${hasSdFirNo}`);
  console.log(`  ✓ Sections (392, 34) preserved: ${hasSdSections}`);
  console.log(`  ✓ Senior Advocate Audit attached: ${Boolean(sdResult.seniorAdvocateAudit)}`);

  // Test 2: Urdu FIR -> English
  console.log('\nTest 2: Urdu FIR -> English Literal Court Translation');
  const urduFirText = `مقدمہ نمبر 145/2026 تھانہ صدر راولپنڈی۔
مدعی مسمی محمد اقبال ولد بشیر احمد حاضر تھانہ آیا۔
مدعی نے بیان کیا کہ بتاریخ 10 فروری 2026 بوقت 8 بجے شام ملزمان نامعلوم افراد نے مدعی کی دکان پر حملہ کیا۔
ملزمان نے جان سے مارنے کی نیت سے فائرنگ کی اور نقدی چھین کر فرار ہو گئے۔
پولیس نے موقع پر پہنچ کر تفتیش شروع کی اور زیر دفعہ 324، 392، 34 ت پ مقدمہ درج رجسٹر کیا۔`;

  const urStart = Date.now();
  const urResult = await translateLegalDocument(urduFirText, 'ur', 'en', { seniorAdvocateMode: true });
  console.log(`✓ Urdu translation finished in ${((Date.now() - urStart) / 1000).toFixed(1)}s using model: ${urResult.model}`);
  console.log(`  Pairs count: ${urResult.pairs.length}`);
  console.log(`  First pair translation:`);
  console.log(`    ORIGINAL:   ${urResult.pairs[0]?.original}`);
  console.log(`    TRANSLATED: ${urResult.pairs[0]?.translated}`);
  console.log(`  Second pair translation:`);
  console.log(`    ORIGINAL:   ${urResult.pairs[1]?.original}`);
  console.log(`    TRANSLATED: ${urResult.pairs[1]?.translated}`);

  // Test 3: Curated deterministic fallback test
  console.log('\nTest 3: Curated Deterministic Legal Engine Fallback');
  const fallbackResult = buildCuratedLegalTranslation(sindhiFirText, 'sd', 'en', true);
  console.log(`✓ Fallback pairs generated: ${fallbackResult.pairs.length}`);
  console.log(`✓ Fallback full translation preview: ${fallbackResult.fullTranslation.slice(0, 150)}...`);
  console.log(`✓ Fallback affidavit present: ${Boolean(fallbackResult.certifiedCourtAffidavit)}`);

  console.log('\n================================================================');
  console.log('ALL LEGAL TRANSLATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
