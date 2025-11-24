'use client';

import React, { useState, useEffect } from 'react';

export default function DebugPage() {
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: '',
  });
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    // Read credentials from localStorage
    const apiKey = localStorage.getItem('binance_api_key');
    const apiSecret = localStorage.getItem('binance_api_secret');
    setCredentials({
      apiKey: apiKey || '',
      apiSecret: apiSecret || '',
    });
  }, []);

  const handleSaveTest = () => {
    localStorage.setItem('binance_api_key', credentials.apiKey);
    localStorage.setItem('binance_api_secret', credentials.apiSecret);
    
    // Verify immediately
    const saved = localStorage.getItem('binance_api_key');
    const secret = localStorage.getItem('binance_api_secret');
    
    setTestMessage(
      `✓ Saved! ApiKey: ${saved ? 'YES (' + saved.length + ' chars)' : 'NO'}, ApiSecret: ${secret ? 'YES (' + secret.length + ' chars)' : 'NO'}`
    );
  };

  const handleTestAPI = async () => {
    const apiKey = localStorage.getItem('binance_api_key');
    const apiSecret = localStorage.getItem('binance_api_secret');

    if (!apiKey || !apiSecret) {
      setTestMessage('❌ Credentials not found in localStorage');
      return;
    }

    try {
      const res = await fetch('/api/binance/positions', {
        headers: {
          'x-api-key': apiKey,
          'x-api-secret': apiSecret,
        },
      });
      const data = await res.json();
      setTestMessage(
        res.ok
          ? `✓ API Call Success: ${data.positions?.length || 0} positions found`
          : `❌ API Error: ${data.error}`
      );
    } catch (err: any) {
      setTestMessage(`❌ Request Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1>🔧 Binance Credentials Debug</h1>
      
      <div style={{ marginBottom: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <h2>Current localStorage State:</h2>
        <p>
          API Key: {credentials.apiKey ? `✓ (${credentials.apiKey.length} chars)` : '❌ Empty'}
        </p>
        <p>
          API Secret: {credentials.apiSecret ? `✓ (${credentials.apiSecret.length} chars)` : '❌ Empty'}
        </p>
      </div>

      <div style={{ marginBottom: '30px', backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <h2>Test Save:</h2>
        <input
          type="password"
          placeholder="Test API Key"
          value={credentials.apiKey}
          onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
          style={{ display: 'block', marginBottom: '10px', padding: '8px', width: '300px' }}
        />
        <input
          type="password"
          placeholder="Test API Secret"
          value={credentials.apiSecret}
          onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
          style={{ display: 'block', marginBottom: '10px', padding: '8px', width: '300px' }}
        />
        <button
          onClick={handleSaveTest}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          Save to localStorage
        </button>
        <button
          onClick={handleTestAPI}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Test API Call
        </button>
      </div>

      {testMessage && (
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            borderLeft: '4px solid #007bff',
            fontSize: '16px',
          }}
        >
          <strong>Result:</strong> {testMessage}
        </div>
      )}

      <div style={{ marginTop: '30px', backgroundColor: '#fff3cd', padding: '15px', borderRadius: '4px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Paste your Binance API Key in the first field</li>
          <li>Paste your Binance API Secret in the second field</li>
          <li>Click "Save to localStorage"</li>
          <li>Click "Test API Call" to verify it works</li>
          <li>If successful, go back to main page and refresh</li>
        </ol>
      </div>
    </div>
  );
}

