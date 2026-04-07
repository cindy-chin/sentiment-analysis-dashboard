import { useMemo } from 'react';
import {
  Box, Heading, Text, SimpleGrid, Stat, StatLabel, StatValueText,
  StatHelpText, Badge, HStack, VStack, Card, CardBody, CardHeader,
  Spinner,
} from '@chakra-ui/react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useData } from '../data/api';
import WordCloud from '../components/WordCloud';

export default function TopicOverview() {
  const { topics, TOPIC_COLORS, globalStats, loading, error } = useData();

  const pieData = useMemo(() => (topics || []).map((t) => ({ name: t.label, value: t.postCount })), [topics]);
  const barData = useMemo(() =>
    (topics || []).map((t) => ({ name: t.label, posts: t.postCount, color: t.color })).sort((a, b) => b.posts - a.posts),
    [topics]
  );

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /><Text mt={4}>Loading data...</Text></Box>;
  if (error) return <Box textAlign="center" py={20}><Text color="red.500">Error: {error}</Text></Box>;

  return (
    <Box>
      <VStack align="start" gap={1} mb={6}>
        <Heading size="lg" bgGradient="to-r" gradientFrom="blue.600" gradientTo="green.500" bgClip="text">
          Public Sentiment Overview
        </Heading>
        <Text color="gray.600">
          What are Singaporeans talking about? Analysis of {globalStats.totalPosts.toLocaleString()} Reddit posts from r/Singapore ({globalStats.dateRange}).
        </Text>
      </VStack>

      {/* Summary stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={8}>
        <Card.Root bg="linear-gradient(135deg, #EBF5FF 0%, #E0F0FF 100%)" borderWidth="1px" borderColor="blue.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="blue.600">Total Posts</StatLabel>
              <StatValueText color="blue.800">{globalStats.totalPosts.toLocaleString()}</StatValueText>
              <StatHelpText>{globalStats.dateRange}</StatHelpText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #F0FFF4 0%, #C6F6D5 100%)" borderWidth="1px" borderColor="green.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="green.600">Topic Clusters</StatLabel>
              <StatValueText color="green.800">{globalStats.tfidfClusters}</StatValueText>
              <StatHelpText>TF-IDF + K-Means</StatHelpText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #EBF5FF 0%, #F0E8FF 100%)" borderWidth="1px" borderColor="blue.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="blue.600">Viral Posts (100+)</StatLabel>
              <StatValueText color="blue.800">{globalStats.viralPosts.toLocaleString()}</StatValueText>
              <StatHelpText>{(globalStats.viralPosts * 100 / globalStats.totalPosts).toFixed(1)}% of total</StatHelpText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #F0FFF4 0%, #E6FFED 100%)" borderWidth="1px" borderColor="green.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="green.600">Avg Engagement</StatLabel>
              <StatValueText color="green.800">{globalStats.avgComments}</StatValueText>
              <StatHelpText>comments per post</StatHelpText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* TF-IDF Charts */}
      <VStack align="start" gap={1} mb={4}>
        <Heading size="md" bgGradient="to-r" gradientFrom="blue.600" gradientTo="green.500" bgClip="text">
          TF-IDF Clustering ({topics.length} clusters)
        </Heading>
      </VStack>
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={8}>
        <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
          <CardHeader pb={0}>
            <Heading size="sm" color="blue.700">Topic Distribution (by post count)</Heading>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={240} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Bar dataKey="posts" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card.Root>

        <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
          <CardHeader pb={0}>
            <Heading size="sm" color="green.600">Topic Share</Heading>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={600}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name.split('&')[0].trim()} (${(percent * 100).toFixed(0)}%)`}
                  labelLine
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Word Clouds per Cluster */}
      <VStack align="start" gap={1} mb={4}>
        <Heading size="md" bgGradient="to-r" gradientFrom="blue.600" gradientTo="green.500" bgClip="text">
          Topic Clusters ({topics.length})
        </Heading>
        <Text color="gray.600" fontSize="sm">
          Topic clusters discovered via TF-IDF vectorisation + K-Means. Word size reflects TF-IDF importance score.
        </Text>
      </VStack>
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        {topics.map((topic) => (
          <Link to={`/topics/${topic.id}`} key={topic.id} style={{ textDecoration: 'none' }}>
            <Card.Root
              cursor="pointer"
              _hover={{ shadow: 'lg', borderColor: 'green.200', transform: 'translateY(-2px)' }}
              borderWidth="1px"
              borderColor="blue.100"
              bg="white"
              transition="all 0.2s"
              h="100%"
            >
              <CardHeader pb={0}>
                <HStack justify="space-between">
                  <HStack gap={2}>
                    <Box w={3} h={3} rounded="full" bg={topic.color} />
                    <Heading size="sm">{topic.label}</Heading>
                  </HStack>
                  <Badge colorPalette="blue" fontSize="xs">
                    {topic.postCount.toLocaleString()} posts
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody>
                <WordCloud words={topic.wordcloud} />
                <Box mt={3}>
                  <Text fontSize="xs" color="gray.500" mb={1} fontWeight="semibold">
                    Top words
                  </Text>
                  <HStack flexWrap="wrap" gap={1}>
                    {topic.wordcloud.slice(0, 5).map((w, i) => (
                      <Badge key={w.text} variant="subtle" colorPalette={i === 0 ? 'blue' : 'blue'} fontSize="xs">
                        #{i + 1} {w.text} ({w.value})
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              </CardBody>
            </Card.Root>
          </Link>
        ))}
      </SimpleGrid>
    </Box>
  );
}
