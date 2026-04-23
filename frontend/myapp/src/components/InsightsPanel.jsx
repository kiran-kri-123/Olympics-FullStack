import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import '../styles/InsightsPanel.css';

const GENDER_COLORS = ['#2f67d5', '#4bb3b5', '#7ab648', '#9caac5'];
const MEDAL_COLORS = {
  gold: '#d4a216',
  silver: '#a0a6b3',
  bronze: '#a56e45',
};

export function InsightsPanel({ analytics, loading, error }) {
  const genderChartData = useMemo(() => (
    Object.entries(analytics.genderDistribution || {}).map(([name, value]) => ({ name, value }))
  ), [analytics.genderDistribution]);

  const participationChartData = useMemo(() => (
    (analytics.athleteParticipation || [])
      .slice(-20)
      .map((item) => ({
        year: item._id,
        athletes: item.athleteCount,
        records: item.totalRecords,
      }))
  ), [analytics.athleteParticipation]);

  const seasonChartData = useMemo(() => {
    const grouped = (analytics.eventsBySeason || []).reduce((acc, item) => {
      const year = item._id?.year;
      const season = item._id?.season || 'Unknown';
      if (!year) return acc;
      if (!acc[year]) {
        acc[year] = { year };
      }
      acc[year][season] = item.eventCount || 0;
      return acc;
    }, {});

    return Object.values(grouped).slice(-16);
  }, [analytics.eventsBySeason]);

  if (loading) {
    return <section className="insights-panel">Loading insights...</section>;
  }

  if (error) {
    return <section className="insights-panel insights-error">Insights unavailable: {error}</section>;
  }

  return (
    <section className="insights-panel">
      <div className="insight-card large">
        <h3>Athlete Participation Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={participationChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dce7fb" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="athletes" stroke="#2f67d5" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="records" stroke="#4bb3b5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="insight-card">
        <h3>Gender Distribution</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={genderChartData} dataKey="value" nameKey="name" outerRadius={92} label>
              {genderChartData.map((entry, index) => (
                <Cell key={entry.name} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="insight-card">
        <h3>Top Medal Leaders</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={(analytics.medalLeaders || []).slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dce7fb" />
            <XAxis dataKey="country" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={64} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="gold" stackId="a" fill={MEDAL_COLORS.gold} />
            <Bar dataKey="silver" stackId="a" fill={MEDAL_COLORS.silver} />
            <Bar dataKey="bronze" stackId="a" fill={MEDAL_COLORS.bronze} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="insight-card large">
        <h3>Events by Season (Recent Editions)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={seasonChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dce7fb" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Summer" fill="#2f67d5" />
            <Bar dataKey="Winter" fill="#4bb3b5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
