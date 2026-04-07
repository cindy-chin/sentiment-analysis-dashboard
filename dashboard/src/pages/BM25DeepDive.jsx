import { useParams, Link } from 'react-router-dom';
import {
  Box, Heading, Text, VStack, HStack, Badge, Card, CardBody,
  CardHeader, SimpleGrid, Button, Stat, StatLabel, StatValueText,
  StatHelpText, Spinner,
} from '@chakra-ui/react';
import { FiArrowLeft, FiThumbsUp, FiMessageSquare, FiAlertTriangle } from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import WordCloud from '../components/WordCloud';
import { useData } from '../data/api';

export default function BM25DeepDive() {
  const { cluster } = useParams();
  const { bm25Topics, loading, error } = useData();

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /><Text mt={4}>Loading...</Text></Box>;
  if (error) return <Box textAlign="center" py={20}><Text color="red.500">Error: {error}</Text></Box>;

  const topic = bm25Topics.find((t) => t.id === Number(cluster));

  if (!topic) {
    return (
      <Box textAlign="center" py={20}>
        <Heading size="md" mb={4}>BM25 Cluster not found</Heading>
        <Button as={Link} to="/" colorPalette="blue">Back to Overview</Button>
      </Box>
    );
  }

  const bucketData = topic.scoreBuckets
    ? Object.entries(topic.scoreBuckets).map(([k, v]) => ({ bucket: k, count: v }))
    : [];

  return (
    <Box>
      <Button as={Link} to="/" variant="ghost" size="sm" mb={4}>
        <FiArrowLeft /> Back to Overview
      </Button>

      <HStack gap={3} mb={2}>
        <Box w={4} h={4} rounded="full" bg={topic.color} />
        <Heading size="lg" bgGradient="to-r" gradientFrom="green.500" gradientTo="blue.500" bgClip="text">{topic.label}</Heading>
        <Badge colorPalette="green" fontSize="sm">{topic.postCount.toLocaleString()} posts</Badge>
      </HStack>
      <Text color="gray.600" mb={6}>
        Deep dive into this BM25 cluster — engagement stats, keywords, word cloud, and top posts from r/Singapore.
      </Text>

      {/* Engagement stats */}
      <SimpleGrid columns={{ base: 2, md: 5 }} gap={4} mb={8}>
        <Card.Root bg="linear-gradient(135deg, #EBF5FF 0%, #E0F0FF 100%)" borderWidth="1px" borderColor="blue.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="blue.600">Posts</StatLabel>
              <StatValueText color="blue.800">{topic.postCount.toLocaleString()}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #F0FFF4 0%, #C6F6D5 100%)" borderWidth="1px" borderColor="green.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="green.600">Avg Score</StatLabel>
              <StatValueText color="green.800">{topic.avgScore}</StatValueText>
              <StatHelpText>upvotes per post</StatHelpText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #EBF5FF 0%, #F0E8FF 100%)" borderWidth="1px" borderColor="blue.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="blue.600">Avg Comments</StatLabel>
              <StatValueText color="blue.800">{topic.avgComments}</StatValueText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #F0FFF4 0%, #E6FFED 100%)" borderWidth="1px" borderColor="green.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="green.600">Viral Posts</StatLabel>
              <StatValueText color="green.800">{topic.viralCount}</StatValueText>
              <StatHelpText>100+ upvotes</StatHelpText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
        <Card.Root bg="linear-gradient(135deg, #EBF5FF 0%, #E0F0FF 100%)" borderWidth="1px" borderColor="blue.100">
          <CardBody>
            <Stat.Root>
              <StatLabel color="blue.600">Singlish Usage</StatLabel>
              <StatValueText color="blue.800">{topic.singlishPct}%</StatValueText>
              <StatHelpText>of posts</StatHelpText>
            </Stat.Root>
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={8}>
        {/* Keywords */}
        <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
          <CardHeader pb={2}>
            <Heading size="sm" color="green.600">Top Keywords (BM25)</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <HStack flexWrap="wrap" gap={2}>
              {topic.keywords.map((kw, i) => (
                <Badge
                  key={kw}
                  colorPalette="green"
                  variant={i < 3 ? 'solid' : 'subtle'}
                  fontSize="sm"
                  px={3}
                  py={1}
                  rounded="full"
                >
                  {kw}
                </Badge>
              ))}
            </HStack>
          </CardBody>
        </Card.Root>

        {/* Word Cloud */}
        <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
          <CardHeader pb={2}>
            <Heading size="sm" color="green.600">Word Cloud</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <WordCloud words={topic.wordcloud} />
          </CardBody>
        </Card.Root>
      </SimpleGrid>

      {/* Score distribution */}
      {bucketData.length > 0 && (
        <Card.Root mb={8}>
          <CardHeader pb={0}>
            <Heading size="sm">Score Distribution</Heading>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bucketData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={topic.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card.Root>
      )}

      {/* Top posts */}
      <Heading size="md" mb={4}>Top Posts</Heading>
      <VStack gap={4} align="stretch" mb={8}>
        {topic.posts.map((post) => (
          <Card.Root key={post.id} borderWidth="1px" borderColor="green.100" bg="white" _hover={{ shadow: 'sm', borderColor: 'green.200' }} transition="all 0.2s">
            <CardBody>
              <Heading size="sm" mb={2}>{post.title}</Heading>
              <Text color="gray.600" mb={3} fontSize="sm">{post.text}</Text>
              <HStack gap={4} color="gray.500" fontSize="sm">
                <HStack gap={1}>
                  <FiThumbsUp />
                  <Text>{post.score.toLocaleString()}</Text>
                </HStack>
                <HStack gap={1}>
                  <FiMessageSquare />
                  <Text>{post.comments} comments</Text>
                </HStack>
                <Badge variant="subtle" fontSize="xs">
                  {(post.upvoteRatio * 100).toFixed(0)}% upvoted
                </Badge>
              </HStack>
            </CardBody>
          </Card.Root>
        ))}
      </VStack>

      {/* Controversial posts */}
      {topic.controversialPosts && topic.controversialPosts.length > 0 && (
        <>
          <HStack mb={4} gap={2}>
            <FiAlertTriangle color="orange" />
            <Heading size="md">Most Controversial</Heading>
          </HStack>
          <VStack gap={3} align="stretch">
            {topic.controversialPosts.map((post, i) => (
              <Card.Root key={i} borderWidth="1px" borderColor="green.200" bg="green.50">
                <CardBody>
                  <Heading size="sm" mb={2}>{post.title}</Heading>
                  <HStack gap={4} color="gray.500" fontSize="sm">
                    <Badge colorPalette="orange" variant="solid" fontSize="xs">
                      {(post.upvoteRatio * 100).toFixed(0)}% upvoted
                    </Badge>
                    <HStack gap={1}>
                      <FiThumbsUp />
                      <Text>{post.score}</Text>
                    </HStack>
                    <HStack gap={1}>
                      <FiMessageSquare />
                      <Text>{post.comments} comments</Text>
                    </HStack>
                  </HStack>
                </CardBody>
              </Card.Root>
            ))}
          </VStack>
        </>
      )}
    </Box>
  );
}
