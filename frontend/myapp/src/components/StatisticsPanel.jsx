import React from 'react';
import '../styles/StatisticsPanel.css';

export function StatisticsPanel({ summary }) {
  if (!summary) return null;

  const medalBreakdown = summary.medalBreakdown || {};
  const topSports = summary.topSports || [];
  const topCountries = summary.topCountries || [];

  return (
    <div className="statistics-panel">
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Records</h4>
          <p className="stat-value">{summary.totalRecords?.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <h4>Unique Athletes</h4>
          <p className="stat-value">{summary.uniqueAthletes?.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <h4>Countries</h4>
          <p className="stat-value">{summary.countriesRepresented}</p>
        </div>

        <div className="stat-card">
          <h4>Sports</h4>
          <p className="stat-value">{summary.sportsCovered}</p>
        </div>
      </div>

      <div className="stats-breakdown">
        <div className="breakdown-section">
          <h4>Medal Breakdown</h4>
          <div className="medal-stats">
            <div className={`medal-stat gold`}>
              <span className="medal-type">Gold</span>
              <span className="medal-count">{medalBreakdown.Gold || 0}</span>
            </div>
            <div className={`medal-stat silver`}>
              <span className="medal-type">Silver</span>
              <span className="medal-count">{medalBreakdown.Silver || 0}</span>
            </div>
            <div className={`medal-stat bronze`}>
              <span className="medal-type">Bronze</span>
              <span className="medal-count">{medalBreakdown.Bronze || 0}</span>
            </div>
            <div className={`medal-stat none`}>
              <span className="medal-type">No Medal</span>
              <span className="medal-count">{medalBreakdown.None || 0}</span>
            </div>
          </div>
        </div>

        {topCountries.length > 0 && (
          <div className="breakdown-section">
            <h4>Top Countries</h4>
            <ul className="top-list">
              {topCountries.slice(0, 5).map(country => (
                <li key={country.label}>
                  <span className="label">{country.label}</span>
                  <span className="count">{country.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {topSports.length > 0 && (
          <div className="breakdown-section">
            <h4>Top Sports</h4>
            <ul className="top-list">
              {topSports.slice(0, 5).map(sport => (
                <li key={sport.label}>
                  <span className="label">{sport.label}</span>
                  <span className="count">{sport.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
