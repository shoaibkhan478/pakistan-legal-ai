const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const draftRoutes = require('../src/routes/draft.routes');
const translationRoutes = require('../src/routes/translation.routes');

app.use('/api/v1/drafts', draftRoutes);
app.use('/api/v1/translation', translationRoutes);
app.use('/api/v1/translate', translationRoutes);

async function runHttpTests() {
  console.log('====================================================');
  console.log('HTTP ENDPOINTS INTEGRATION TEST');
  console.log('====================================================\n');

  // Test 1: GET /api/v1/translation/languages
  console.log('Test 1: GET /api/v1/translation/languages');
  const langRes = await request(app)
    .get('/api/v1/translation/languages')
    .expect(200);

  console.log('✓ Status: 200 OK');
  console.log('✓ Supported languages response:', langRes.body.data);
  if (!langRes.body.data.ur || !langRes.body.data.sd) {
    throw new Error('Missing expected languages in response');
  }

  // Test 2: POST /api/v1/translation/translate
  console.log('\nTest 2: POST /api/v1/translation/translate');
  const transRes = await request(app)
    .post('/api/v1/translation/translate')
    .send({
      sourceText: 'مقدمہ درج کیا گیا اور ملزم گرفتار ہوا۔',
      sourceLang: 'ur',
      targetLang: 'en',
    })
    .expect(200);

  console.log('✓ Status: 200 OK');
  console.log('✓ Translation pairs count:', transRes.body.data?.pairs?.length);
  console.log('✓ Full translation:', transRes.body.data?.fullTranslation);

  // Test 3: POST /api/v1/drafts/generate (downloadable .docx)
  console.log('\nTest 3: POST /api/v1/drafts/generate (Downloadable .docx)');
  const docxRes = await request(app)
    .post('/api/v1/drafts/generate')
    .responseType('blob')
    .send({
      draftType: 'bail_application',
      userFacts: 'Applicant Zeeshan Ali, FIR 88/2026 PS Cantt Lahore, seeking post arrest bail.',
      format: 'docx',
    })
    .expect(200);

  const contentType = docxRes.headers['content-type'];
  const contentDisp = docxRes.headers['content-disposition'];
  console.log('✓ Status: 200 OK');
  console.log('✓ Content-Type:', contentType);
  console.log('✓ Content-Disposition:', contentDisp);

  const buf = docxRes.body;
  const isZip = Buffer.isBuffer(buf) && buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;
  console.log(`✓ Valid .docx binary buffer received (${buf.length} bytes, zip magic bytes verified: ${isZip})`);

  if (!contentType.includes('wordprocessingml.document')) {
    throw new Error(`Unexpected Content-Type: ${contentType}`);
  }
  if (!contentDisp || !contentDisp.includes('bail_application.docx')) {
    throw new Error(`Unexpected Content-Disposition: ${contentDisp}`);
  }
  if (!isZip) {
    throw new Error('Downloaded file is not a valid zip/docx binary');
  }

  // Test 4: POST /api/v1/drafts/generate-docx (dedicated docx endpoint)
  console.log('\nTest 4: POST /api/v1/drafts/generate-docx (Explicit Endpoint)');
  const docxRes2 = await request(app)
    .post('/api/v1/drafts/generate-docx')
    .responseType('blob')
    .send({
      draftType: 'legal_notice',
      userFacts: 'Client XYZ demands payment of PKR 500,000 within 14 days.',
    })
    .expect(200);

  console.log('✓ Status: 200 OK');
  console.log('✓ Content-Type:', docxRes2.headers['content-type']);
  console.log('✓ Content-Disposition:', docxRes2.headers['content-disposition']);
  console.log(`✓ Buffer size: ${docxRes2.body.length} bytes, valid: ${docxRes2.body[0] === 0x50 && docxRes2.body[1] === 0x4b}`);

  console.log('\n====================================================');
  console.log('ALL HTTP INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
  process.exit(0);
}

runHttpTests().catch((err) => {
  console.error('HTTP integration test failed:', err);
  process.exit(1);
});
