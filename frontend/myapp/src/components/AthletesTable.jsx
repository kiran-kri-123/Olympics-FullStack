import React, { useMemo, useState } from 'react';
import '../styles/AthletesTable.css';

export function AthletesTable({
  athletes,
  total,
  loadedCount,
  page,
  totalPages,
  onPageChange,
  loading,
  error,
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'year', direction: 'desc' });

  const sortedAthletes = useMemo(() => {
    const list = [...(athletes || [])];
    const { key, direction } = sortConfig;
    const factor = direction === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });

    return list;
  }, [athletes, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  if (error) {
    return (
      <div className="athletes-table error">
        <p>Error loading athletes: {error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="athletes-table loading">
        <p>Loading athletes...</p>
      </div>
    );
  }

  if (!athletes || athletes.length === 0) {
    return (
      <div className="athletes-table empty">
        <p>No athletes found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="athletes-table-container">
      <div className="table-header">
        <div>
          <h3>Athletes ({total.toLocaleString()} total matches)</h3>
          <p className="table-info">
            Showing {loadedCount.toLocaleString()} records on page {page}
            {' '}
            ({page}/{totalPages} pages)
          </p>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="athletes-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="sort-button" onClick={() => requestSort('name')}>Name</button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => requestSort('region')}>Country</button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => requestSort('sport')}>Sport</button>
              </th>
              <th>Event</th>
              <th>
                <button type="button" className="sort-button" onClick={() => requestSort('medal')}>Medal</button>
              </th>
              <th>
                <button type="button" className="sort-button" onClick={() => requestSort('year')}>Year</button>
              </th>
              <th>Season</th>
              <th>
                <button type="button" className="sort-button" onClick={() => requestSort('age')}>Age</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAthletes.map((athlete, idx) => (
              <tr key={`${athlete._id || athlete.athleteId || 'row'}-${idx}`} className={`medal-row medal-${athlete.medal?.toLowerCase()}`}>
                <td className="athlete-name">{athlete.name}</td>
                <td>{athlete.region}</td>
                <td>{athlete.sport}</td>
                <td className="event-cell">{athlete.event}</td>
                <td className={`medal medal-${athlete.medal?.toLowerCase()}`}>{athlete.medal}</td>
                <td>{athlete.year}</td>
                <td>{athlete.season}</td>
                <td>{athlete.age || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-pagination">
        <button
          type="button"
          className="pagination-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="pagination-text">Page {page} of {totalPages}</span>
        <button
          type="button"
          className="pagination-button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
