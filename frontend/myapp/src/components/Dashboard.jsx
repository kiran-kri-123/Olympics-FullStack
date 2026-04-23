import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FilterPanel } from './FilterPanel';
import { AthletesTable } from './AthletesTable';
import { StatisticsPanel } from './StatisticsPanel';
import { InsightsPanel } from './InsightsPanel';
import { apiClient } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';

const FETCH_LIMIT = 100;

export function Dashboard() {
  const { user, logout } = useAuth();
  const skipNextFilterFetchRef = useRef(true);

  const [filters, setFilters] = useState({
    country: '',
    medal: '',
    sport: '',
    year: '',
    search: '',
  });

  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    sports: [],
    years: [],
    medals: ['Gold', 'Silver', 'Bronze', 'None'],
  });

  const [athletes, setAthletes] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState({
    medalLeaders: [],
    athleteParticipation: [],
    genderDistribution: {},
    eventsBySeason: [],
  });

  const [initialLoading, setInitialLoading] = useState(true);
  const [athletesLoading, setAthletesLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [error, setError] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const [medalLeaders, athleteParticipation, genderDistribution, eventsBySeason] = await Promise.all([
        apiClient.getMedalLeaders(),
        apiClient.getAthleteParticipation(),
        apiClient.getGenderDistribution(),
        apiClient.getEventsBySeason(),
      ]);

      setAnalytics({
        medalLeaders: medalLeaders || [],
        athleteParticipation: athleteParticipation || [],
        genderDistribution: genderDistribution || {},
        eventsBySeason: eventsBySeason || [],
      });
      setAnalyticsError(null);
    } catch (err) {
      setAnalyticsError(err.message || 'Failed to load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);
        const [summaryData, athletesData] = await Promise.all([
          apiClient.getSummary(),
          apiClient.getAthletes({ limit: FETCH_LIMIT, page: 1 }),
        ]);

        setSummary(summaryData || null);
        setFilterOptions((prev) => ({
          ...prev,
          countries: summaryData?.filterOptions?.countries || [],
          sports: summaryData?.filterOptions?.sports || [],
          years: summaryData?.filterOptions?.years || [],
        }));

        setAthletes(athletesData?.records || []);
        setTotal(athletesData?.total || 0);
        setCurrentPage(athletesData?.page || 1);
        setTotalPages(athletesData?.totalPages || 1);
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
    loadAnalytics();
  }, [loadAnalytics]);

  const fetchFilteredAthletes = useCallback(async (currentFilters, page = 1) => {
    try {
      setAthletesLoading(true);
      setError(null);
      const data = await apiClient.getAthletes({
        limit: FETCH_LIMIT,
        page,
        ...currentFilters,
      });
      setAthletes(data?.records || []);
      setTotal(data?.total || 0);
      setCurrentPage(data?.page || page);
      setTotalPages(data?.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to fetch athletes.');
      setAthletes([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setAthletesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipNextFilterFetchRef.current) {
      skipNextFilterFetchRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchFilteredAthletes(filters, 1);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, fetchFilteredAthletes]);

  const handlePageChange = (nextPage) => {
    if (nextPage === currentPage || nextPage < 1 || nextPage > totalPages) {
      return;
    }
    setCurrentPage(nextPage);
    fetchFilteredAthletes(filters, nextPage);
  };

  const tableLoading = initialLoading || athletesLoading;

  return (
    <div className="dashboard">
      <header className="dashboard-topbar">
        <div>
          <h1>Olympics Performance Intelligence</h1>
          <p className="dashboard-subtitle">
            Explore athletes, medals, and participation trends across Olympic history.
          </p>
        </div>

        <div className="dashboard-actions">
          <div className="user-chip">{user?.name || 'Analyst'}</div>
          <button type="button" className="topbar-button secondary" onClick={loadAnalytics}>
            Refresh Insights
          </button>
          <button type="button" className="topbar-button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {summary && <StatisticsPanel summary={summary} />}

      <InsightsPanel
        analytics={analytics}
        loading={analyticsLoading}
        error={analyticsError}
      />

      <div className="dashboard-content">
        <aside className="dashboard-sidebar">
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            filterOptions={filterOptions}
            loading={tableLoading}
          />
        </aside>

        <main className="dashboard-main">
          <AthletesTable
            athletes={athletes}
            total={total}
            loadedCount={athletes.length}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            loading={tableLoading}
            error={error}
          />
        </main>
      </div>
    </div>
  );
}
