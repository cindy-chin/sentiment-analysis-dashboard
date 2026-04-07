import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box, Heading, Text, VStack, HStack, SimpleGrid, Card, CardBody,
  CardHeader, Stat, StatLabel, StatValueText, Spinner, Badge,
  Table, Separator,
} from '@chakra-ui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, AreaChart, Area, PieChart, Pie, ErrorBar, ComposedChart,
} from 'recharts';
import { FiSmile, FiTrendingUp, FiBarChart2, FiTarget, FiClock } from 'react-icons/fi';
import { useData } from '../data/api';

const EMOTIONS = ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'];
const EMOTION_COLORS = {
  anger: '#FC8181',
  disgust: '#F6AD55',
  fear: '#B794F4',
  joy: '#38A169',
  neutral: '#63B3ED',
  sadness: '#3D9AFF',
  surprise: '#4FD1C5',
};

const pctFormatter = (v) => `${(v * 100).toFixed(1)}%`;
const pctTickFormatter = (v) => `${(v * 100).toFixed(0)}%`;

const CustomTooltip = ({ active, payload, label, isPercent }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box bg="white" border="1px solid" borderColor="gray.200" rounded="md" p={2} shadow="md" fontSize="xs">
      <Text fontWeight="bold" mb={1}>{label}</Text>
      {payload.map((p) => (
        <HStack key={p.dataKey} gap={1}>
          <Box w="8px" h="8px" rounded="full" bg={p.color} />
          <Text>{p.dataKey}:</Text>
          <Text fontWeight="600">{isPercent ? pctFormatter(p.value) : p.value}</Text>
        </HStack>
      ))}
    </Box>
  );
};

// Correlation matrix rendered as a simple table with colored cells
function CorrMatrix({ data }) {
  if (!data?.emotions?.length) return null;
  const { emotions, matrix } = data;
  const getColor = (v) => {
    if (v >= 0.6) return '#2F855A';
    if (v >= 0.3) return '#38A169';
    if (v >= 0.1) return '#C6F6D5';
    if (v >= -0.1) return '#EDF2F7';
    if (v >= -0.3) return '#A3D1FF';
    if (v >= -0.6) return '#3D9AFF';
    return '#2B7DE9';
  };
  return (
    <Box overflowX="auto">
      <Box as="table" fontSize="xs" borderCollapse="collapse">
        <thead>
          <tr>
            <th style={{ padding: '4px 8px' }}></th>
            {emotions.map((e) => (
              <th key={e} style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 600 }}>{e}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {emotions.map((e, i) => (
            <tr key={e}>
              <td style={{ padding: '4px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{e}</td>
              {matrix[i].map((v, j) => (
                <td key={j} style={{
                  padding: '4px 6px', textAlign: 'center',
                  backgroundColor: getColor(v),
                  color: Math.abs(v) > 0.3 ? 'white' : '#1a202c',
                  borderRadius: '2px',
                }}>
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

// ── Violin shape (rendered directly, not via recharts bars) ────────────────
function ViolinPlot({ data, width, height, yMin = 0, yMax = 1 }) {
  if (!data?.length) return null;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;
  const PCTS = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100];

  const toY = (v) => padTop + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const yTicks = [0.2, 0.4, 0.6, 0.8, 1.0];
  const colW = innerW / data.length;
  const maxHalfW = colW * 0.42;

  // Catmull-Rom to cubic bezier conversion for smooth curves
  const catmullToBezier = (pts) => {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };

  const buildPath = (percentiles, cx) => {
    const bins = PCTS.length - 1;
    const spacings = [];
    for (let i = 0; i < bins; i++) {
      const dp = PCTS[i + 1] - PCTS[i];
      const dv = percentiles[i + 1] - percentiles[i];
      spacings.push(dv > 0 ? dp / dv : 0);
    }
    const maxS = Math.max(...spacings);
    const hw = spacings.map((s) => maxS > 0 ? (s / maxS) * maxHalfW : 0);

    // Midpoints for right side (value increases upward, SVG y decreases)
    const rightPts = [];
    for (let i = 0; i < bins; i++) {
      const midVal = (percentiles[i] + percentiles[i + 1]) / 2;
      rightPts.push([cx + hw[i], toY(midVal)]);
    }
    // Anchor tips at exact min/max
    const topPt = [cx, toY(percentiles[percentiles.length - 1])];
    const botPt = [cx, toY(percentiles[0])];
    const allRight = [botPt, ...rightPts, topPt];
    const allLeft  = [topPt, ...rightPts.slice().reverse().map(([rx, ry]) => [cx - (rx - cx), ry]), botPt];

    const rightPath = catmullToBezier(allRight);
    const leftPath  = catmullToBezier(allLeft);
    return `${rightPath} ${leftPath} Z`;
  };

  return (
    <svg width={width} height={height}>
      {/* grid + y-axis */}
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="#e2e8f0" strokeWidth={1} />
      {yTicks.map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={padLeft - 4} y1={y} x2={padLeft + innerW} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#718096">{Math.round(v * 100)}%</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padLeft + i * colW + colW / 2;
        const pcts = d.percentiles || [d.min, d.p25, d.p25, d.p25, d.p25, d.p25, d.median, d.median, d.p75, d.p75, d.p75, d.p75, d.max, d.max, d.max];
        const violinPath = buildPath(pcts, cx);
        const medY = toY(d.median);
        const medHw = colW * 0.18;
        return (
          <g key={d.emotion}>
            {/* violin body */}
            <path d={violinPath} fill={d.color} fillOpacity={0.55} stroke={d.color} strokeWidth={1.5} strokeLinejoin="round" />
            {/* median dot */}
            <line x1={cx - medHw} y1={medY} x2={cx + medHw} y2={medY} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
            {/* x-axis label */}
            <text x={cx} y={padTop + innerH + 28} textAnchor="middle" fontSize={11} fill="#4a5568">{d.emotion.charAt(0).toUpperCase() + d.emotion.slice(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Box Plot SVG component ─────────────────────────────────────────────────────────
function BoxPlotSVG({ data, width, height, valKey, p05Key, p25Key, p75Key, p95Key, medKey, label }) {
  if (!data?.length) return null;
  const padL = 60, padR = 20, padT = 20, padB = 40;
  const iW = width - padL - padR;
  const iH = height - padT - padB;

  // auto y range from p05 / p95 across all entries
  const allVals = data.flatMap((d) => [d[p05Key] ?? 0, d[p95Key] ?? 0]);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = (rawMax - rawMin) * 0.08 || 1;
  const yMin = Math.max(0, rawMin - pad);
  const yMax = rawMax + pad;

  const toY = (v) => padT + iH - ((v - yMin) / (yMax - yMin)) * iH;

  // nice y ticks
  const range = yMax - yMin;
  const step = Math.pow(10, Math.floor(Math.log10(range / 4)));
  const niceStep = [1, 2, 5, 10].find((s) => range / (s * step) <= 6) * step;
  const yTicks = [];
  for (let v = Math.ceil(yMin / niceStep) * niceStep; v <= yMax + 1e-9; v += niceStep) {
    yTicks.push(parseFloat(v.toFixed(10)));
  }

  const colW = iW / data.length;
  const boxHW = colW * 0.28;
  const capHW = colW * 0.18;

  return (
    <svg width={width} height={height}>
      <line x1={padL} y1={padT} x2={padL} y2={padT + iH} stroke="#e2e8f0" strokeWidth={1} />
      {yTicks.map((v) => {
        const y = toY(v);
        if (y < padT - 2 || y > padT + iH + 2) return null;
        return (
          <g key={v}>
            <line x1={padL - 4} y1={y} x2={padL + iW} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#718096">{v % 1 === 0 ? v : v.toFixed(1)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = padL + i * colW + colW / 2;
        const yP05 = toY(d[p05Key] ?? d[p25Key]);
        const yP25 = toY(d[p25Key]);
        const yMed = toY(d[medKey]);
        const yP75 = toY(d[p75Key]);
        const yP95 = toY(d[p95Key] ?? d[p75Key]);
        const boxH = Math.max(yP25 - yP75, 1);
        return (
          <g key={d.emotion}>
            {/* upper whisker: p75 → p95 */}
            <line x1={cx} y1={yP95} x2={cx} y2={yP75} stroke={d.color} strokeWidth={1.5} />
            <line x1={cx - capHW} y1={yP95} x2={cx + capHW} y2={yP95} stroke={d.color} strokeWidth={1.5} />
            {/* IQR box */}
            <rect x={cx - boxHW} y={yP75} width={boxHW * 2} height={boxH} fill={d.color} fillOpacity={0.65} stroke={d.color} strokeWidth={1.5} rx={2} />
            {/* median line */}
            <line x1={cx - boxHW} y1={yMed} x2={cx + boxHW} y2={yMed} stroke="white" strokeWidth={2.5} />
            {/* lower whisker: p05 → p25 */}
            <line x1={cx} y1={yP25} x2={cx} y2={yP05} stroke={d.color} strokeWidth={1.5} />
            <line x1={cx - capHW} y1={yP05} x2={cx + capHW} y2={yP05} stroke={d.color} strokeWidth={1.5} />
            {/* label */}
            <text x={cx} y={padT + iH + 28} textAnchor="middle" fontSize={11} fill="#4a5568">{d.emotion.charAt(0).toUpperCase() + d.emotion.slice(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function BoxPlotContainer({ data, height, valKey, p05Key, p25Key, p75Key, p95Key, medKey, label }) {
  const ref = useRef(null);
  const [w, setW] = useState(700);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, []);
  return (
    <Box ref={ref} w="100%">
      <BoxPlotSVG data={data} width={w} height={height}
        valKey={valKey} p05Key={p05Key} p25Key={p25Key} p75Key={p75Key} p95Key={p95Key} medKey={medKey} label={label} />
    </Box>
  );
}
// ──────────────────────────────────────────────────────────────────────────

function ViolinContainer({ data, height, yMin, yMax }) {
  const ref = useRef(null);
  const [w, setW] = useState(700);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, []);
  return (
    <Box ref={ref} w="100%">
      <ViolinPlot data={data} width={w} height={height} yMin={yMin} yMax={yMax} />
    </Box>
  );
}
// ──────────────────────────────────────────────────────────────────────────

export default function EmotionAnalysis() {
  const { emotionData, loading, error } = useData();
  const [activeTab, setActiveTab] = useState('overview');
  const [exploreEmotion, setExploreEmotion] = useState('');
  const [exploreSort, setExploreSort] = useState('score');

  const tabs = [
    { key: 'overview', label: 'Overview', icon: FiSmile },
    { key: 'trends', label: 'Time Trends', icon: FiTrendingUp },
    { key: 'temporal', label: 'Temporal', icon: FiClock },
    { key: 'engagement', label: 'Engagement', icon: FiBarChart2 },
    { key: 'confidence', label: 'Confidence', icon: FiTarget },
    { key: 'explore', label: 'Explore Posts', icon: FiBarChart2 },
  ];

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /><Text mt={4}>Loading...</Text></Box>;
  if (error) return <Box textAlign="center" py={20}><Text color="red.500">Error: {error}</Text></Box>;

  const d = emotionData || {};
  const stats = d.stats || {};
  const dist = d.distribution || [];
  const monthly = d.monthlyTrends || [];
  const byDow = d.byDow || [];
  const byHour = d.byHour || [];
  const byBucket = d.byBucket || [];
  const byFlair = d.byFlair || [];
  const engagement = d.engagement || [];
  const confidence = d.confidence || [];
  const avgProbs = d.avgProbs || [];
  const probCorr = d.probCorrelation || {};
  const samplePosts = d.samplePosts || {};
  const hourDowHeatmap = d.hourDowHeatmap || [];

  // Build Hour×DOW matrix: {day: {hour: dominantEmotion}}
  const DOW_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hourDowMatrix = useMemo(() => {
    const m = {};
    hourDowHeatmap.forEach(({ day, hour, dominant }) => {
      if (!m[day]) m[day] = {};
      m[day][hour] = dominant;
    });
    return m;
  }, [hourDowHeatmap]);

  // Explore posts: flatten samplePosts and allow filtering/sorting
  const allExplorePosts = useMemo(() => {
    const out = [];
    Object.entries(samplePosts).forEach(([emotion, posts]) => {
      (posts || []).forEach((p) => out.push({ ...p, emotion }));
    });
    return out;
  }, [samplePosts]);

  // Box-plot data: add IQR error arrays for ErrorBar
  const confBoxData = useMemo(() => confidence, [confidence]);

  const engBoxData = useMemo(() => engagement, [engagement]);

  return (
    <Box>
      <VStack align="start" gap={1} mb={6}>
        <Heading size="lg" bgGradient="to-r" gradientFrom="blue.600" gradientTo="green.500" bgClip="text">
          Sentiment Analysis
        </Heading>
        <Text color="gray.600">
          Sentiment classification of {stats.totalPosts?.toLocaleString()} r/Singapore posts — distribution, temporal patterns, engagement, and model confidence.
        </Text>
      </VStack>

      {/* KPIs */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
        <Card.Root bg="linear-gradient(135deg, #EBF5FF 0%, #E0F0FF 100%)" borderWidth="1px" borderColor="blue.100">
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs" color="blue.600">Total Posts</StatLabel>
              <StatValueText fontSize="lg" color="blue.800">{stats.totalPosts?.toLocaleString()}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #F0FFF4 0%, #C6F6D5 100%)" borderWidth="1px" borderColor="green.100">
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs" color="green.600">Dominant Sentiment</StatLabel>
              <StatValueText fontSize="lg" color="green.800">
                <Badge colorPalette={stats.dominantEmotion === 'joy' ? 'green' : stats.dominantEmotion === 'anger' ? 'red' : 'gray'}>
                  {stats.dominantEmotion}
                </Badge>
                {' '}{stats.dominantPct}%
              </StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #EBF5FF 0%, #F0E8FF 100%)" borderWidth="1px" borderColor="blue.100">
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs" color="blue.600">Avg Model Confidence</StatLabel>
              <StatValueText fontSize="lg" color="blue.800">{stats.avgConfidence}%</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #F0FFF4 0%, #E6FFED 100%)" borderWidth="1px" borderColor="green.100">
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs" color="green.600">Months Covered</StatLabel>
              <StatValueText fontSize="lg" color="green.800">{stats.monthsCovered}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Tab navigation */}
      <HStack gap={1} mb={6} flexWrap="wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <HStack
              key={t.key}
              px={3} py={2} rounded="md" fontSize="sm" cursor="pointer"
              fontWeight={activeTab === t.key ? '600' : '400'}
              color={activeTab === t.key ? 'blue.700' : 'gray.600'}
              bg={activeTab === t.key ? 'blue.50' : 'transparent'}
              _hover={{ bg: 'gray.50' }}
              onClick={() => setActiveTab(t.key)}
              gap={1.5}
            >
              <Icon size={14} />
              <Text>{t.label}</Text>
            </HStack>
          );
        })}
      </HStack>

      {/* ─── Tab: Overview ─── */}
      {activeTab === 'overview' && (
        <VStack gap={6} align="stretch">
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
            {/* Distribution bar */}
            <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
              <CardHeader pb={0}><Heading size="sm" color="blue.700">Sentiment Distribution</Heading></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={[...dist].sort((a, b) => b.count - a.count)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="emotion" type="category" width={70} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v, name) => name === 'count' ? v.toLocaleString() : pctFormatter(v)} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {dist.map((d) => <Cell key={d.emotion} fill={EMOTION_COLORS[d.emotion]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card.Root>

            {/* Pie chart */}
            <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
              <CardHeader pb={0}><Heading size="sm" color="green.600">Sentiment Share</Heading></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={dist}
                      dataKey="count"
                      nameKey="emotion"
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={110}
                      label={({ emotion, share }) => `${emotion} ${(share * 100).toFixed(1)}%`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {dist.map((d) => <Cell key={d.emotion} fill={EMOTION_COLORS[d.emotion]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card.Root>
          </SimpleGrid>

          {/* By Flair */}
          {byFlair.length > 0 && (
            <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
              <CardHeader pb={0}><Heading size="sm" color="blue.700">Sentiment by Post Flair (Top 10)</Heading></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={byFlair}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="flair" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={80} />
                    <YAxis tickFormatter={pctTickFormatter} />
                    <Tooltip content={<CustomTooltip isPercent />} />
                    <Legend />
                    {EMOTIONS.map((e) => (
                      <Bar key={e} dataKey={e} stackId="a" fill={EMOTION_COLORS[e]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card.Root>
          )}

          {/* Sample posts */}
          <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
            <CardHeader pb={0}><Heading size="sm" color="green.600">Top Posts per Sentiment</Heading></CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                {EMOTIONS.filter((e) => samplePosts[e]?.length).map((e) => (
                  <Box key={e} p={3} borderWidth="1px" rounded="md" borderColor="gray.100">
                    <HStack mb={2}>
                      <Box w="10px" h="10px" rounded="full" bg={EMOTION_COLORS[e]} />
                      <Text fontWeight="600" fontSize="sm" textTransform="capitalize">{e}</Text>
                    </HStack>
                    <VStack align="stretch" gap={1}>
                      {samplePosts[e].map((p, i) => (
                        <Box key={i} fontSize="xs" p={1.5} bg="gray.50" rounded="sm">
                          <Text noOfLines={2} fontWeight="500">{p.title}</Text>
                          {p.content && (
                            <Text noOfLines={3} color="gray.600" mt={0.5}>{p.content}</Text>
                          )}
                          <HStack gap={2} mt={0.5} color="gray.500">
                            <Text>↑{p.score}</Text>
                            <Text>💬{p.comments}</Text>
                            {p.confidence && <Text>{(p.confidence * 100).toFixed(0)}% conf</Text>}
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </CardBody>
          </Card.Root>
        </VStack>
      )}

      {/* ─── Tab: Time Trends ─── */}
      {activeTab === 'trends' && (
        <VStack gap={6} align="stretch">
          {/* Line chart */}
          <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
            <CardHeader pb={0}><Heading size="sm" color="blue.700">Monthly Sentiment Share Trends</Heading></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={1} angle={-45} textAnchor="end" height={60} />
                  <YAxis tickFormatter={pctTickFormatter} />
                  <Tooltip content={<CustomTooltip isPercent />} />
                  <Legend />
                  {EMOTIONS.map((e) => (
                    <Line key={e} type="monotone" dataKey={e} stroke={EMOTION_COLORS[e]}
                      strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card.Root>

          {/* Stacked area */}
          <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
            <CardHeader pb={0}><Heading size="sm" color="green.600">Monthly Sentiment Composition (Stacked Area)</Heading></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={380}>
                <AreaChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={1} angle={-45} textAnchor="end" height={60} />
                  <YAxis tickFormatter={pctTickFormatter} />
                  <Tooltip content={<CustomTooltip isPercent />} />
                  <Legend />
                  {EMOTIONS.map((e) => (
                    <Area key={e} type="monotone" dataKey={e} stackId="1"
                      stroke={EMOTION_COLORS[e]} fill={EMOTION_COLORS[e]} fillOpacity={0.7} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card.Root>

          {/* Heatmap table */}
          <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
            <CardHeader pb={0}><Heading size="sm" color="blue.700">Sentiment Share Heatmap (Sentiment × Month)</Heading></CardHeader>
            <CardBody>
              <Box overflowX="auto">
                <Box as="table" fontSize="sm" borderCollapse="collapse" w="100%">
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 13 }}>Sentiment</th>
                      {monthly.map((row) => (
                        <th key={row.month} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap', minWidth: 72, fontSize: 12 }}>{row.month}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EMOTIONS.map((e) => (
                      <tr key={e}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap', fontSize: 13 }}>{e}</td>
                        {monthly.map((row) => {
                          const v = row[e] || 0;
                          const intensity = Math.min(v / 0.5, 1);
                          // YlOrRd: yellow (#ffffb2) → orange (#fd8d3c) → red (#bd0026)
                          const r = Math.round(255 - intensity * (255 - 189));
                          const g = Math.round(255 - intensity * (255 - 0));
                          const b = Math.round(178 - intensity * 178);
                          return (
                            <td key={row.month} style={{
                              padding: '10px 6px', textAlign: 'center',
                              backgroundColor: v === 0 ? '#f7fafc' : `rgb(${r},${g},${b})`,
                              color: intensity > 0.55 ? 'white' : '#1a202c',
                              fontSize: 12,
                              fontWeight: 500,
                            }}>
                              {(v * 100).toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
            </CardBody>
          </Card.Root>
        </VStack>
      )}

      {/* ─── Tab: Temporal Patterns ─── */}
      {activeTab === 'temporal' && (
        <VStack gap={6} align="stretch">
          {/* DOW */}
          {byDow.length > 0 && (
            <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
              <CardHeader pb={0}><Heading size="sm" color="blue.700">Emotion Share by Day of Week</Heading></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={byDow}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(0, 3)} />
                    <YAxis tickFormatter={pctTickFormatter} />
                    <Tooltip content={<CustomTooltip isPercent />} />
                    <Legend />
                    {EMOTIONS.map((e) => (
                      <Bar key={e} dataKey={e} stackId="a" fill={EMOTION_COLORS[e]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card.Root>
          )}

          {/* Score bucket */}
          {byBucket.length > 0 && (
            <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
              <CardHeader pb={0}><Heading size="sm" color="blue.700">Emotion Composition by Score Bucket</Heading></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={byBucket}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={pctTickFormatter} />
                    <Tooltip content={<CustomTooltip isPercent />} />
                    <Legend />
                    {EMOTIONS.map((e) => (
                      <Bar key={e} dataKey={e} stackId="a" fill={EMOTION_COLORS[e]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card.Root>
          )}

          {/* Emotion × Hour heatmap (share per hour, Blues) */}
          {byHour.length > 0 && (
            <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
              <CardHeader pb={0}><Heading size="sm" color="green.600">Emotion Distribution by Hour of Day (SGT)</Heading></CardHeader>
              <CardBody>
                <Box overflowX="auto">
                  <Box as="table" fontSize="12px" borderCollapse="collapse" w="100%">
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13 }}>Sentiment</th>
                        {byHour.map((row) => (
                          <th key={row.hour} style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 500, minWidth: 38 }}>
                            {String(row.hour).padStart(2, '0')}:00
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {EMOTIONS.map((e) => (
                        <tr key={e}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap', fontSize: 13 }}>{e}</td>
                          {byHour.map((row) => {
                            const v = row[e] || 0;
                            const intensity = Math.min(v / 0.5, 1);
                            // Blues: #deebf7 → #3182bd
                            const r = Math.round(222 - intensity * (222 - 49));
                            const g = Math.round(235 - intensity * (235 - 130));
                            const b = Math.round(247 - intensity * (247 - 189));
                            return (
                              <td key={row.hour} style={{
                                padding: '10px 4px', textAlign: 'center',
                                backgroundColor: v === 0 ? '#f7fafc' : `rgb(${r},${g},${b})`,
                                color: intensity > 0.55 ? 'white' : '#1a202c',
                                fontWeight: 500,
                              }}>
                                {(v * 100).toFixed(1)}%
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </Box>
                </Box>
              </CardBody>
            </Card.Root>
          )}
        </VStack>
      )}

      {/* ─── Tab: Engagement ─── */}
      {activeTab === 'engagement' && (
        <VStack gap={6} align="stretch">
          {/* Score & Comments proper box plots */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
            <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
              <CardHeader pb={0}><Heading size="sm" color="blue.700">Score Distribution by Emotion (≤p95)</Heading></CardHeader>
              <CardBody>
                <BoxPlotContainer data={engBoxData} height={380}
                  valKey="medianScore" p05Key="p05Score" p25Key="p25Score"
                  p75Key="p75Score" p95Key="p95Score" medKey="medianScore" label="Score" />
                <Text fontSize="xs" color="gray.400" mt={1} textAlign="center">Box = Q1–Q3 · white line = median · whiskers = P5–P95</Text>
              </CardBody>
            </Card.Root>

            <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
              <CardHeader pb={0}><Heading size="sm" color="green.600">Comments Distribution by Emotion (≤p95)</Heading></CardHeader>
              <CardBody>
                <BoxPlotContainer data={engBoxData} height={380}
                  valKey="medianComments" p05Key="p05Comments" p25Key="p25Comments"
                  p75Key="p75Comments" p95Key="p95Comments" medKey="medianComments" label="Comments" />
                <Text fontSize="xs" color="gray.400" mt={1} textAlign="center">Box = Q1–Q3 · white line = median · whiskers = P5–P95</Text>
              </CardBody>
            </Card.Root>
          </SimpleGrid>

          {/* Upvote Ratio per emotion */}
          <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
            <CardHeader pb={0}><Heading size="sm" color="green.600">Avg Upvote Ratio by Sentiment</Heading></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={engagement}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="emotion" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tickFormatter={pctTickFormatter} />
                  <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
                  <Bar dataKey="avgUpvoteRatio" name="Avg Upvote Ratio" radius={[4, 4, 0, 0]}>
                    {engagement.map((d) => <Cell key={d.emotion} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card.Root>

          {/* Engagement detail table */}
          <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
            <CardHeader pb={0}><Heading size="sm" color="blue.700">Engagement Summary Table</Heading></CardHeader>
            <CardBody>
              <Box overflowX="auto">
                <Box as="table" fontSize="xs" borderCollapse="collapse" w="100%">
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Emotion</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Posts</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Avg Score</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Median Score</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Avg Comments</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Median Comments</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Avg Upvote Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagement.map((e) => (
                      <tr key={e.emotion} style={{ borderBottom: '1px solid #edf2f7' }}>
                        <td style={{ padding: '6px 10px' }}>
                          <HStack gap={1.5}>
                            <Box w="8px" h="8px" rounded="full" bg={e.color} />
                            <Text textTransform="capitalize">{e.emotion}</Text>
                          </HStack>
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{e.count.toLocaleString()}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{e.avgScore}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{e.medianScore}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{e.avgComments}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{e.medianComments}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>{(e.avgUpvoteRatio * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              </Box>
            </CardBody>
          </Card.Root>
        </VStack>
      )}

      {/* ─── Tab: Confidence ─── */}
      {activeTab === 'confidence' && (
        <VStack gap={6} align="stretch">
          {/* Confidence box-like chart */}
          {confBoxData.length > 0 && (
            <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
              <CardHeader pb={0}><Heading size="sm" color="blue.700">Model Confidence by Predicted Emotion</Heading></CardHeader>
              <CardBody>
                <ViolinContainer data={confBoxData} height={420} yMin={0.2} yMax={1} />
                <Text fontSize="xs" color="gray.400" mt={1} mb={3} textAlign="center">Violin shape = distribution density · box = Q1–Q3 · colored line = median</Text>
                <SimpleGrid columns={{ base: 3, md: 7 }} gap={2}>
                  {confBoxData.map((c) => (
                    <Box key={c.emotion} p={2} bg="gray.50" rounded="md" fontSize="xs" textAlign="center">
                      <Text fontWeight="600" textTransform="capitalize" mb={0.5}>{c.emotion}</Text>
                      <Text color="gray.500">Min: {pctFormatter(c.min)}</Text>
                      <Text>Q1: {pctFormatter(c.p25)}</Text>
                      <Text fontWeight="600">Med: {pctFormatter(c.median)}</Text>
                      <Text>Q3: {pctFormatter(c.p75)}</Text>
                      <Text color="gray.500">Max: {pctFormatter(c.max)}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
              </CardBody>
            </Card.Root>
          )}

          {/* Average probabilities */}
          {avgProbs.length > 0 && (
            <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
              <CardHeader pb={0}><Heading size="sm" color="green.600">Average Probability per Sentiment Class</Heading></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={avgProbs}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="emotion" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 'auto']} tickFormatter={pctTickFormatter} />
                    <Tooltip formatter={(v) => pctFormatter(v)} />
                    <Bar dataKey="avgProb" name="Avg Probability" radius={[4, 4, 0, 0]}>
                      {avgProbs.map((d) => <Cell key={d.emotion} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card.Root>
          )}


        </VStack>
      )}

      {/* ─── Tab: Explore Posts ─── */}
      {activeTab === 'explore' && (
        <VStack gap={6} align="stretch">
          <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
            <CardHeader pb={0}><Heading size="sm" color="blue.700">Sample Posts by Sentiment</Heading></CardHeader>
            <CardBody>
              <HStack gap={4} mb={4} flexWrap="wrap">
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>Sentiment</Text>
                  <HStack gap={1} flexWrap="wrap">
                    <Box
                      px={2} py={1} rounded="md" fontSize="xs" cursor="pointer"
                      fontWeight={exploreEmotion === '' ? '600' : '400'}
                      bg={exploreEmotion === '' ? 'blue.50' : 'gray.50'}
                      color={exploreEmotion === '' ? 'blue.700' : 'gray.600'}
                      onClick={() => setExploreEmotion('')}
                    >
                      All
                    </Box>
                    {EMOTIONS.map((e) => (
                      <Box
                        key={e} px={2} py={1} rounded="md" fontSize="xs" cursor="pointer"
                        fontWeight={exploreEmotion === e ? '600' : '400'}
                        bg={exploreEmotion === e ? EMOTION_COLORS[e] + '33' : 'gray.50'}
                        color={exploreEmotion === e ? 'gray.800' : 'gray.600'}
                        borderWidth="1px"
                        borderColor={exploreEmotion === e ? EMOTION_COLORS[e] : 'transparent'}
                        onClick={() => setExploreEmotion(e)}
                      >
                        {e}
                      </Box>
                    ))}
                  </HStack>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500" mb={1}>Sort by</Text>
                  <HStack gap={1}>
                    {[{k:'score',l:'Score'},{k:'comments',l:'Comments'},{k:'confidence',l:'Confidence'}].map(({k,l}) => (
                      <Box
                        key={k} px={2} py={1} rounded="md" fontSize="xs" cursor="pointer"
                        fontWeight={exploreSort === k ? '600' : '400'}
                        bg={exploreSort === k ? 'blue.50' : 'gray.50'}
                        color={exploreSort === k ? 'blue.700' : 'gray.600'}
                        onClick={() => setExploreSort(k)}
                      >
                        {l}
                      </Box>
                    ))}
                  </HStack>
                </Box>
              </HStack>

              {(() => {
                const filtered = exploreEmotion
                  ? allExplorePosts.filter((p) => p.emotion === exploreEmotion)
                  : allExplorePosts;
                const sorted = [...filtered].sort((a, b) => (b[exploreSort] ?? 0) - (a[exploreSort] ?? 0));
                return (
                  <Box overflowX="auto">
                    <Box as="table" fontSize="xs" borderCollapse="collapse" w="100%">
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f7fafc' }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Title</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Sentiment</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Score</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Comments</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Upvote %</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Confidence</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Month</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Flair</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((p, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '6px 10px', maxWidth: 360 }}>
                              <Text noOfLines={2} fontWeight="500">{p.title}</Text>
                              {p.content && (
                                <Text noOfLines={2} color="gray.500" mt={0.5}>{p.content}</Text>
                              )}
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              <HStack gap={1}>
                                <Box w="8px" h="8px" rounded="full" bg={EMOTION_COLORS[p.emotion]} />
                                <Text textTransform="capitalize">{p.emotion}</Text>
                              </HStack>
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>{p.score ?? '—'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>{p.comments ?? '—'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                              {p.upvoteRatio != null ? `${(p.upvoteRatio * 100).toFixed(0)}%` : '—'}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                              {p.confidence != null ? `${(p.confidence * 100).toFixed(0)}%` : '—'}
                            </td>
                            <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>{p.month ?? '—'}</td>
                            <td style={{ padding: '6px 10px', maxWidth: 140 }}>
                              <Text noOfLines={1}>{p.flair ?? '—'}</Text>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                    <Text fontSize="xs" color="gray.400" mt={2}>{sorted.length} posts shown</Text>
                  </Box>
                );
              })()}
            </CardBody>
          </Card.Root>
        </VStack>
      )}
    </Box>
  );
}
