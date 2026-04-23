import React, { useState, useEffect } from 'react';
import '../styles/FilterPanel.css';

export function FilterPanel({ 
  filters, 
  onFilterChange, 
  filterOptions = {},
  loading = false 
}) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (field, value) => {
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  const handleReset = () => {
    const resetFilters = {
      country: '',
      medal: '',
      sport: '',
      year: '',
      search: ''
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="filter-panel">
      <h3>Filters</h3>
      
      <div className="filter-group">
        <label htmlFor="search">Search Athletes</label>
        <input
          id="search"
          type="text"
          placeholder="Enter athlete name..."
          value={localFilters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          disabled={loading}
          className="filter-input"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="country">Country</label>
        <select
          id="country"
          value={localFilters.country || ''}
          onChange={(e) => handleChange('country', e.target.value)}
          disabled={loading}
          className="filter-select"
        >
          <option value="">All Countries</option>
          {filterOptions.countries?.map(country => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="medal">Medal Type</label>
        <select
          id="medal"
          value={localFilters.medal || ''}
          onChange={(e) => handleChange('medal', e.target.value)}
          disabled={loading}
          className="filter-select"
        >
          <option value="">All Medals</option>
          <option value="Gold">Gold</option>
          <option value="Silver">Silver</option>
          <option value="Bronze">Bronze</option>
          <option value="None">No Medal</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="sport">Sport</label>
        <select
          id="sport"
          value={localFilters.sport || ''}
          onChange={(e) => handleChange('sport', e.target.value)}
          disabled={loading}
          className="filter-select"
        >
          <option value="">All Sports</option>
          {filterOptions.sports?.map(sport => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="year">Year</label>
        <select
          id="year"
          value={localFilters.year || ''}
          onChange={(e) => handleChange('year', e.target.value)}
          disabled={loading}
          className="filter-select"
        >
          <option value="">All Years</option>
          {[...(filterOptions.years || [])].sort((a, b) => b - a).map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <button 
        onClick={handleReset}
        disabled={loading}
        className="reset-button"
      >
        Reset Filters
      </button>

      {loading && <div className="loading-indicator">Updating...</div>}
    </div>
  );
}
