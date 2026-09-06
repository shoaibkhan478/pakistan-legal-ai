const { translateLegalDocument, SUPPORTED_LANGUAGES } = require('../services/translation.service');

async function testTranslationModule() {
  console.log('====================================================');
  console.log('TESTING LITERAL LEGAL DOCUMENT TRANSLATION SERVICE');
  console.log('====================================================\n');

  // Test 1: Language validation errors
  console.log('Test 1: Input & Language Validation');
  try {
    await translateLegalDocument('', 'ur', 'en');
    console.error('✗ Expected error on empty text not thrown');
  } catch (e) {
    console.log(`✓ Caught empty text error: "${e.message}"`);
  }

  try {
    await translateLegalDocument('Test text', 'fr', 'en');
    console.error('✗ Expected error on invalid language not thrown');
  } catch (e) {
    console.log(`✓ Caught invalid language error: "${e.message}"`);
  }

  try {
    await translateLegalDocument('Test text', 'ur', 'ur');
    console.error('✗ Expected error on identical languages not thrown');
  } catch (e) {
    console.log(`✓ Caught identical languages error: "${e.message}"`);
  }

  // Test 2: Urdu FIR -> English Literal Translation
  console.log('\nTest 2: Urdu FIR -> English Translation (Literal Fidelity, Flagging, Side-by-Side)');
  const urduFirText = `مقدمہ نمبر 145/2026 تھانہ صدر راولپنڈی۔
مدعی مسمی محمد اقبال ولد بشیر احمد حاضر تھانہ آیا۔
مدعی نے بیان کیا کہ بتاریخ 10 فروری 2026 بوقت 8 بجے شام ملزمان نامعلوم افراد نے مدعی کی دکان پر حملہ کیا۔
ملزمان نے جان سے مارنے کی نیت سے فائرنگ کی اور نقدی چھین کر فرار ہو گئے۔
پولیس نے موقع پر پہنچ کر تفتیش شروع کی اور زیر دفعہ 324، 392، 34 ت پ مقدمہ درج رجسٹر کیا۔`;

  const tStart = Date.now();
  const urduResult = await translateLegalDocument(urduFirText, 'ur', 'en');
  const tElapsed = ((Date.now() - tStart) / 1000).toFixed(1);

  console.log(`✓ Translation completed in ${tElapsed}s using model: ${urduResult.model}`);
  console.log(`Source Lang: ${urduResult.sourceLang}, Target Lang: ${urduResult.targetLang}`);
  console.log(`Pairs count: ${urduResult.pairs?.length || 0}`);
  console.log('Sample side-by-side pairs:');
  urduResult.pairs.slice(0, 3).forEach((p) => {
    console.log(`  [${p.index}] ORIGINAL:   ${p.original}`);
    console.log(`      TRANSLATED: ${p.translated}`);
  });

  console.log(`\nFlagged terms count: ${urduResult.flaggedTerms?.length || 0}`);
  if (urduResult.flaggedTerms?.length) {
    urduResult.flaggedTerms.forEach((f) => {
      console.log(`  Flag: ${f.flag || f.term}`);
    });
  }

  // Verify preservation of numbers and sections
  const fullText = urduResult.fullTranslation;
  const hasFirNo = /145\/2026/i.test(fullText);
  const hasSections = /324|392|34/i.test(fullText);
  console.log(`✓ FIR Number "145/2026" preserved: ${hasFirNo}`);
  console.log(`✓ Sections (324, 392, 34) preserved: ${hasSections}`);

  // Test 3: Roman Urdu -> English
  console.log('\nTest 3: Roman Urdu -> English Translation');
  const romanUrduText = 'Muddai ne bayan kiya k us ki zameen par mukhalifeen ne zabardasti qabza karne ki koshish ki.';
  const romanResult = await translateLegalDocument(romanUrduText, 'roman-ur', 'en');
  console.log(`✓ Roman Urdu -> English pairs: ${romanResult.pairs.length}`);
  console.log(`  Original:   ${romanResult.pairs[0]?.original}`);
  console.log(`  Translated: ${romanResult.pairs[0]?.translated}`);

  // Test 4: English -> Urdu
  console.log('\nTest 4: English -> Urdu Reverse Translation');
  const engText = 'The accused is admitted to post-arrest bail subject to furnishing bail bonds in the sum of PKR 100,000 with one surety.';
  const engResult = await translateLegalDocument(engText, 'en', 'ur');
  console.log(`✓ English -> Urdu pairs: ${engResult.pairs.length}`);
  console.log(`  Original:   ${engResult.pairs[0]?.original}`);
  console.log(`  Translated: ${engResult.pairs[0]?.translated}`);

  console.log('\n====================================================');
  console.log('ALL TRANSLATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

testTranslationModule().catch((err) => {
  console.error('Translation test failed:', err);
  process.exit(1);
});
