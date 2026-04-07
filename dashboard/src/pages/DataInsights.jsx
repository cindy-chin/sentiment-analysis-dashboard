import { useState, useMemo } from 'react';
import {
  Box, Heading, Text, VStack, HStack, SimpleGrid, Card, CardBody,
  CardHeader, Badge, Stat, StatLabel, StatValueText, StatHelpText,
  Table, TableHeader, TableBody, TableRow, TableCell, TableColumnHeader,
  TableScrollArea, Separator, Spinner,
} from '@chakra-ui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, ScatterChart, Scatter, ZAxis,
  AreaChart, Area,
} from 'recharts';
import { FiTrendingUp, FiAlertTriangle, FiClock, FiMessageSquare } from 'react-icons/fi';
import { useData } from '../data/api';

// Color scale for heatmap
const getHeatColor = (count, max) => {
  const ratio = count / max;
  if (ratio > 0.8) return '#1a365d';
  if (ratio > 0.6) return '#2a4a7f';
  if (ratio > 0.4) return '#3182ce';
  if (ratio > 0.2) return '#63b3ed';
  return '#bee3f8';
};

export default function DataInsights() {
  const {
    globalStats, monthlyTrends, viralPosts, controversialPosts,
    dowEngagement, hourDistribution, scoreBuckets, singlishByCluster,
    heatmapData, topics, TOPIC_COLORS, loading, error,
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');

  const hourDataSGT = useMemo(() =>
    (hourDistribution || []).map((h) => ({
      ...h,
      sgtHour: (h.hour + 8) % 24,
      label: `${((h.hour + 8) % 24).toString().padStart(2, '0')}:00`,
    })).sort((a, b) => a.sgtHour - b.sgtHour),
    [hourDistribution]
  );

  const maxHeatVal = useMemo(() =>
    Math.max(...(heatmapData || []).map((d) => d.count), 1),
    [heatmapData]
  );

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /><Text mt={4}>Loading...</Text></Box>;
  if (error) return <Box textAlign="center" py={20}><Text color="red.500">Error: {error}</Text></Box>;

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Box>
      <VStack align="start" gap={1} mb={6}>
        <Heading size="lg">Data Insights</Heading>
        <Text color="gray.600">
          Deep analytics on {globalStats.totalPosts.toLocaleString()} r/Singapore posts — activity patterns, engagement trends, controversy, and linguistic analysis.
        </Text>
      </VStack>

      {/* Quick stats row */}
      <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} gap={3} mb={8}>
        <Card.Root>
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs">Avg Score</StatLabel>
              <StatValueText fontSize="lg">{globalStats.avgScore}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root>
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs">Max Score</StatLabel>
              <StatValueText fontSize="lg">{globalStats.maxScore.toLocaleString()}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root>
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs">Median Score</StatLabel>
              <StatValueText fontSize="lg">{globalStats.medianScore}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root>
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs">Max Comments</StatLabel>
              <StatValueText fontSize="lg">{globalStats.maxComments.toLocaleString()}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root>
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs">Avg Word Count</StatLabel>
              <StatValueText fontSize="lg">{globalStats.avgWordCount}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root>
          <CardBody py={3}>
            <Stat.Root>
              <StatLabel fontSize="xs">Singlish Usage</StatLabel>
              <StatValueText fontSize="lg">{globalStats.singlishPct}%</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Monthly trends */}
      <Card.Root mb={8}>
        <CardHeader pb={0}>
          <HStack gap={2}>
            <FiTrendingUp />
            <Heading size="sm">Monthly Posting Volume & Engagement</Heading>
          </HStack>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="posts" fill="#3182ce" stroke="#3182ce" fillOpacity={0.3} name="Posts" />
              <Area yAxisId="right" type="monotone" dataKey="viralPosts" fill="#E53E3E" stroke="#E53E3E" fillOpacity={0.2} name="Viral Posts" />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card.Root>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={8}>
        {/* Activity heatmap */}
        <Card.Root>
          <CardHeader pb={0}>
            <HStack gap={2}>
              <FiClock />
              <Heading size="sm">Activity Heatmap (UTC)</Heading>
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={1}>Darker = more posts. Add 8 hours for SGT.</Text>
          </CardHeader>
          <CardBody>
            <Box overflowX="auto">
              <Box display="flex" flexDirection="column" gap="2px" minW="500px">
                {/* Hour labels */}
                <HStack gap="2px" ml="70px">
                  {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                    <Text key={h} fontSize="9px" color="gray.500" w="54px" textAlign="center">
                      {h}:00
                    </Text>
                  ))}
                </HStack>
                {dayOrder.map((day) => (
                  <HStack key={day} gap="2px">
                    <Text fontSize="xs" w="65px" textAlign="right" color="gray.600" flexShrink={0}>
                      {day.slice(0, 3)}
                    </Text>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const cell = heatmapData.find((d) => d.day === day && d.hour === hour);
                      const count = cell ? cell.count : 0;
                      return (
                        <Box
                          key={hour}
                          w="18px"
                          h="18px"
                          bg={getHeatColor(count, maxHeatVal)}
                          rounded="sm"
                          title={`${day} ${hour}:00 UTC — ${count} posts`}
                          cursor="default"
                        />
                      );
                    })}
                  </HStack>
                ))}
              </Box>
            </Box>
          </CardBody>
        </Card.Root>

        {/* Hour distribution */}
        <Card.Root>
          <CardHeader pb={0}>
            <Heading size="sm">Posts by Hour (SGT)</Heading>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourDataSGT}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis />
                <Tooltip
                  formatter={(v, name) => [v.toLocaleString(), name === 'posts' ? 'Posts' : 'Avg Score']}
                  labelFormatter={(l) => `${l} SGT`}
                />
                <Bar dataKey="posts" fill="#3182ce" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={8}>
        {/* Day of week engagement */}
        <Card.Root>
          <CardHeader pb={0}>
            <Heading size="sm">Day of Week Engagement</Heading>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dowEngagement}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(0, 3)} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="posts" fill="#3182ce" name="Posts" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgScore" fill="#D69E2E" name="Avg Score" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card.Root>

        {/* Score bucket distribution */}
        <Card.Root>
          <CardHeader pb={0}>
            <Heading size="sm">Score Distribution</Heading>
            <Text fontSize="xs" color="gray.500" mt={1}>
              viral: 100+, high: 50-99, medium: 10-49, low: 1-9, negative: ≤0
            </Text>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={scoreBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreBuckets.map((_, i) => (
                    <Cell key={i} fill={['#E53E3E', '#DD6B20', '#D69E2E', '#3182CE', '#805AD5'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Singlish usage by cluster */}
      <Card.Root mb={8}>
        <CardHeader pb={0}>
          <Heading size="sm">🇸🇬 Singlish Usage by Topic Cluster</Heading>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Percentage of posts containing Singlish expressions, by topic cluster.
          </Text>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={singlishByCluster} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" />
              <YAxis dataKey="label" type="category" width={200} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} name="Singlish %">
                {singlishByCluster.map((_, i) => (
                  <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card.Root>

      {/* Viral & Controversial posts side by side */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={8}>
        {/* Top viral */}
        <Card.Root>
          <CardHeader pb={2}>
            <HStack gap={2}>
              <FiTrendingUp color="green" />
              <Heading size="sm">Top Viral Posts</Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <TableScrollArea maxH="400px" overflowY="auto">
              <Table.Root size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Post</TableColumnHeader>
                    <TableColumnHeader textAlign="end">Score</TableColumnHeader>
                    <TableColumnHeader textAlign="end">Comments</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viralPosts.slice(0, 12).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Text fontSize="xs" lineClamp={2}>{p.title}</Text>
                        <Badge variant="subtle" fontSize="9px" mt={1} colorPalette="blue">
                          {p.clusterLabel.split('&')[0].trim()}
                        </Badge>
                      </TableCell>
                      <TableCell textAlign="end" fontWeight="bold" color="green.600">
                        {p.score.toLocaleString()}
                      </TableCell>
                      <TableCell textAlign="end" fontSize="sm">
                        {p.comments}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table.Root>
            </TableScrollArea>
          </CardBody>
        </Card.Root>

        {/* Most controversial */}
        <Card.Root>
          <CardHeader pb={2}>
            <HStack gap={2}>
              <FiAlertTriangle color="orange" />
              <Heading size="sm">Most Controversial Posts</Heading>
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Low upvote ratio + high comment count = controversial discussion.
            </Text>
          </CardHeader>
          <CardBody pt={0}>
            <TableScrollArea maxH="400px" overflowY="auto">
              <Table.Root size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Post</TableColumnHeader>
                    <TableColumnHeader textAlign="end">Upvote %</TableColumnHeader>
                    <TableColumnHeader textAlign="end">Comments</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controversialPosts.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Text fontSize="xs" lineClamp={2}>{p.title}</Text>
                      </TableCell>
                      <TableCell textAlign="end">
                        <Badge colorPalette="orange" variant="solid" fontSize="xs">
                          {(p.upvoteRatio * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell textAlign="end" fontSize="sm">
                        {p.comments}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table.Root>
            </TableScrollArea>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Monthly engagement detail */}
      <Card.Root mb={8}>
        <CardHeader pb={0}>
          <Heading size="sm">Monthly Engagement Trends</Heading>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="avgScore" stroke="#E53E3E" name="Avg Score" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="avgComments" stroke="#3182CE" name="Avg Comments" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card.Root>
    </Box>
  );
}
