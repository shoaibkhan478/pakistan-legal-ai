// test-fetch.js — isolates whether "premature close" is a Node/TLS issue
// or specific to the @anthropic-ai/sdk. Run: node test-fetch.js
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': 'test',
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({}),
})
  .then(async (res) => {
    console.log('STATUS:', res.status);
    const text = await res.text();
    console.log('BODY:', text);
  })
  .catch((err) => {
    console.error('FETCH FAILED:', err);
  });
