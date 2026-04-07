import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = '/api';

const DataContext = createContext(null);

const EMPTY = {
  TOPIC_COLORS: [],
  globalStats: {},
  topics: [],
  landscapeData: [],
  heatmapData: [],
  monthlyTrends: [],
  viralPosts: [],
  controversialPosts: [],
  dowEngagement: [],
  hourDistribution: [],
  scoreBuckets: [],
  singlishByCluster: [],
  engagementScatter: [],
  timelineData: { stacked: [], details: [], clusterLabels: {}, clusterColors: [] },
  mockSearchResults: [],
  emotionData: {},
};

export function DataProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/all`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <DataContext.Provider value={{ ...data, loading, error }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (ctx === null) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
