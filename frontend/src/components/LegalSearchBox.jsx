'use client';

import { useState } from 'react';

/**
 * frontend/src/components/LegalSearchBox.jsx
 * -----------------------------------------------------
 * Backend API ko call karta hai: POST {BACKEND_URL}/api/legal-search
 * Apne .env.local mein NEXT_PUBLIC_BACKEND_URL set karein
 * (e.g. NEXT_PUBLIC_BACKEND_URL=http://localhost:5000)
 * -----------------------------------------------------
 */
export default function LegalSearchBox() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  async function handleSearch() {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${backendUrl}/api/v1/legal-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Apna legal sawal likhein... (English/Urdu/Roman Urdu)"
          className="flex-1 border rounded-lg px-4 py-2"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Search ho raha hai...' : 'Search'}
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <div className="border rounded-lg p-4 space-y-3">
          <p className="whitespace-pre-wrap">{result.answer}</p>

          {result.sources && result.sources.length > 0 && (
            <div>
              <p className="font-semibold text-sm">Sources:</p>
              <ul className="list-disc list-inside text-sm">
                {result.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
