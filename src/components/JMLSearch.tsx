import * as React from 'react';
import { useState } from 'react';
import { SPFI } from '@pnp/sp';

interface IProps { sp: SPFI; }

export const JMLSearch: React.FC<IProps> = ({ sp }) => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 24px 0' }}>Search</h2>
      <div style={{
        background: 'linear-gradient(135deg, #005BAA 0%, #004A8F 100%)',
        borderRadius: '12px', padding: '40px', marginBottom: '24px', textAlign: 'center',
      }}>
        <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, margin: '0 0 16px 0' }}>
          Search JML Data
        </h3>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search employees, onboardings, transfers, offboardings..."
            style={{
              width: '100%', padding: '12px 20px', borderRadius: '8px', border: 'none',
              fontSize: '15px', boxSizing: 'border-box',
              fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
            }}
          />
        </div>
      </div>
      {searchTerm && (
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <p style={{ color: '#605e5c', fontSize: '14px' }}>
            Search results for &quot;{searchTerm}&quot; will appear here.
            Connect to SharePoint to load live data.
          </p>
        </div>
      )}
    </div>
  );
};

export default JMLSearch;
