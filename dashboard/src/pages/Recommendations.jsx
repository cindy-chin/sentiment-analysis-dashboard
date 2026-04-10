import { useState } from 'react';
import {
  Box, Heading, Text, VStack, HStack, Input, Button, Card, CardBody,
  Badge, Spinner, Separator,
} from '@chakra-ui/react';
import { FiSearch, FiFileText, FiArrowUp, FiMessageSquare, FiStar, FiInfo } from 'react-icons/fi';

const API_BASE = '/api';

const CLUSTER_COLORS = [
  '#3D9AFF', '#38A169', '#6BB5FF', '#68D391', '#2B7DE9', '#2F855A',
  '#A3D1FF', '#F6AD55', '#FC8181', '#B794F4', '#63B3ED', '#F687B3',
  '#4FD1C5', '#FBD38D', '#9AE6B4', '#D53F8C', '#ED8936', '#667EEA',
  '#48BB78', '#E53E3E',
];

function matchLabel(score) {
  if (score > 0.7) return { label: 'High match', color: 'green' };
  if (score >= 0.4) return { label: 'Medium match', color: 'yellow' };
  return { label: 'Low match', color: 'gray' };
}

function ClusterBadge({ cluster, clusterLabel }) {
  const color = CLUSTER_COLORS[cluster % CLUSTER_COLORS.length];
  return (
    <Badge
      size="sm"
      px={2}
      py={0.5}
      rounded="full"
      fontSize="xs"
      style={{
        backgroundColor: color + '22',
        color,
        borderColor: color + '44',
        borderWidth: '1px',
      }}
    >
      {clusterLabel}
    </Badge>
  );
}

function PostCard({ result, rank, isSelected, onSelect }) {
  return (
    <Box cursor="pointer" onClick={() => onSelect(result)} w="full">
    <Card.Root
      size="sm"
      border="1px solid"
      borderColor={isSelected ? 'blue.400' : 'gray.100'}
      bg={isSelected ? 'blue.50' : 'white'}
      pointerEvents="none"
      _hover={{ borderColor: 'blue.300', shadow: 'sm' }}
    >
      <CardBody p={4}>
        <HStack align="flex-start" gap={3}>
          <Text fontSize="xs" color="gray.400" fontWeight="600" pt={0.5} minW="20px">
            #{rank}
          </Text>
          <VStack align="start" gap={1} flex={1} minW={0}>
            <Text fontWeight="600" fontSize="sm" lineClamp={2} color="gray.800">
              {result.title}
            </Text>
            {result.text && (
              <Text fontSize="xs" color="gray.500" lineClamp={2}>
                {result.text}
              </Text>
            )}
            <HStack gap={2} flexWrap="wrap" mt={1}>
              <ClusterBadge cluster={result.cluster} clusterLabel={result.clusterLabel} />
              <HStack gap={1} color="gray.400" fontSize="xs">
                <FiArrowUp size={11} />
                <Text>{result.upvotes.toLocaleString()}</Text>
              </HStack>
              <HStack gap={1} color="gray.400" fontSize="xs">
                <FiMessageSquare size={11} />
                <Text>{result.comments}</Text>
              </HStack>
            </HStack>
          </VStack>
          {isSelected && (
            <Badge colorScheme="blue" size="sm" alignSelf="flex-start">Selected</Badge>
          )}
        </HStack>
      </CardBody>
    </Card.Root>
    </Box>
  );
}

function SeedCard({ post }) {
  return (
    <Card.Root border="2px solid" borderColor="blue.300" bg="blue.50" shadow="sm">
      <CardBody p={4}>
        <VStack align="start" gap={2}>
          <HStack gap={2}>
            <FiStar size={14} color="#3D9AFF" />
            <Text fontSize="xs" fontWeight="700" color="blue.600" textTransform="uppercase" letterSpacing="wider">
              Seed Post
            </Text>
          </HStack>
          <Text fontWeight="700" fontSize="sm" color="gray.800">
            {post.title}
          </Text>
          {post.text && (
            <Text fontSize="xs" color="gray.500" lineClamp={3}>
              {post.text}
            </Text>
          )}
          <HStack gap={2} flexWrap="wrap">
            <ClusterBadge cluster={post.cluster} clusterLabel={post.clusterLabel} />
            <HStack gap={1} color="gray.500" fontSize="xs">
              <FiArrowUp size={11} />
              <Text>{post.upvotes.toLocaleString()}</Text>
            </HStack>
            <HStack gap={1} color="gray.500" fontSize="xs">
              <FiMessageSquare size={11} />
              <Text>{post.comments}</Text>
            </HStack>
          </HStack>
        </VStack>
      </CardBody>
    </Card.Root>
  );
}

function RecommendationCard({ result, rank }) {
  const { label, color } = matchLabel(result.relevanceScore);
  return (
    <Card.Root size="sm" border="1px solid" borderColor="gray.100" _hover={{ borderColor: 'green.200', shadow: 'sm' }}>
      <CardBody p={4}>
        <HStack align="flex-start" gap={3}>
          <Text fontSize="xs" color="gray.400" fontWeight="600" pt={0.5} minW="20px">
            #{rank}
          </Text>
          <VStack align="start" gap={1} flex={1} minW={0}>
            <Text fontWeight="600" fontSize="sm" lineClamp={2} color="gray.800">
              {result.title}
            </Text>
            {result.text && (
              <Text fontSize="xs" color="gray.500" lineClamp={2}>
                {result.text}
              </Text>
            )}
            <HStack gap={2} flexWrap="wrap" mt={1}>
              <ClusterBadge cluster={result.cluster} clusterLabel={result.clusterLabel} />
              <HStack gap={1} color="gray.400" fontSize="xs">
                <FiArrowUp size={11} />
                <Text>{result.upvotes.toLocaleString()}</Text>
              </HStack>
              <HStack gap={1} color="gray.400" fontSize="xs">
                <FiMessageSquare size={11} />
                <Text>{result.comments}</Text>
              </HStack>
            </HStack>
          </VStack>
          <Badge colorScheme={color} size="sm" alignSelf="flex-start" whiteSpace="nowrap">
            {label}
          </Badge>
        </HStack>
      </CardBody>
    </Card.Root>
  );
}

function deriveRecommendations(pool, seed, sameClusterOnly) {
  return pool
    .filter((r) => r.id !== seed.id)
    .filter((r) => !sameClusterOnly || r.cluster === seed.cluster)
    .sort((a, b) => {
      const sameA = a.cluster === seed.cluster ? 1 : 0;
      const sameB = b.cluster === seed.cluster ? 1 : 0;
      if (sameB !== sameA) return sameB - sameA;
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
      return b.upvotes - a.upvotes;
    });
}

export default function Recommendations() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [seed, setSeed] = useState(null);
  const [sameClusterOnly, setSameClusterOnly] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSeed(null);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&method=bm25&k=20`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResults(data);
      setLastQuery(q);
      setSearched(true);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const recommendations = seed ? deriveRecommendations(results, seed, sameClusterOnly) : [];

  return (
    <Box maxW="1200px" mx="auto" px={4} py={6}>
      <VStack align="start" gap={6}>
        {/* Header */}
        <VStack align="start" gap={1}>
          <HStack gap={2}>
            <FiStar size={20} color="#3D9AFF" />
            <Heading size="lg" color="gray.800">Post Recommendations</Heading>
            <Badge colorScheme="orange" size="sm" alignSelf="center">Prototype</Badge>
          </HStack>
          <HStack gap={1.5} align="center">
            <FiInfo size={13} color="#A0AEC0" />
            <Text fontSize="sm" color="gray.400">
              Mock recommendations based on current search results — not a trained recommendation model
            </Text>
          </HStack>
        </VStack>

        {/* Search bar */}
        <Card.Root w="full" border="1px solid" borderColor="blue.100" shadow="sm">
          <CardBody p={4}>
            <HStack gap={2}>
              <Input
                placeholder='e.g. "HDB flat prices" or "MRT breakdown"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                size="md"
                flex={1}
                border="1px solid"
                borderColor="gray.200"
                _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px #3D9AFF' }}
              />
              <Button
                onClick={handleSearch}
                loading={loading}
                loadingText="Searching"
                px={6}
                bg="blue.500"
                color="white"
                _hover={{ bg: 'blue.600' }}
              >
                Search
              </Button>
            </HStack>
          </CardBody>
        </Card.Root>

        {/* Loading */}
        {loading && (
          <HStack justify="center" w="full" py={10}>
            <Spinner size="lg" color="blue.400" />
            <Text color="gray.500" fontSize="sm">Searching…</Text>
          </HStack>
        )}

        {/* Error */}
        {error && (
          <Box w="full" p={4} bg="red.50" border="1px solid" borderColor="red.200" rounded="md">
            <Text color="red.600" fontSize="sm">{error}</Text>
          </Box>
        )}

        {/* No results */}
        {searched && !loading && !error && results.length === 0 && (
          <Box w="full" py={10} textAlign="center">
            <FiFileText size={32} color="#CBD5E0" style={{ margin: '0 auto 8px' }} />
            <Text color="gray.400" fontSize="sm">No results found for "{lastQuery}"</Text>
          </Box>
        )}

        {/* Two-column layout */}
        {!loading && results.length > 0 && (
          <HStack align="start" gap={6} w="full" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
            {/* Left: search results */}
            <VStack align="start" gap={3} flex="1" minW={{ base: 'full', md: '340px' }}>
              <Text fontSize="sm" color="gray.500">
                {results.length} results for{' '}
                <Text as="span" fontWeight="600" color="gray.700">"{lastQuery}"</Text>
                {' '}— click a post to select it as the seed
              </Text>
              <Separator />
              {results.map((r, i) => (
                <PostCard
                  key={r.id}
                  result={r}
                  rank={i + 1}
                  isSelected={seed?.id === r.id}
                  onSelect={setSeed}
                />
              ))}
            </VStack>

            {/* Right: seed + recommendations */}
            <VStack align="start" gap={4} flex="1" minW={{ base: 'full', md: '340px' }}>
              {/* Seed post */}
              <VStack align="start" gap={2} w="full">
                <Text fontSize="sm" fontWeight="600" color="gray.600">Selected Post</Text>
                {seed ? (
                  <SeedCard post={seed} />
                ) : (
                  <Box
                    w="full"
                    p={6}
                    border="2px dashed"
                    borderColor="gray.200"
                    rounded="md"
                    textAlign="center"
                  >
                    <FiStar size={24} color="#CBD5E0" style={{ margin: '0 auto 8px' }} />
                    <Text color="gray.400" fontSize="sm">
                      Select a post above to see similar posts
                    </Text>
                  </Box>
                )}
              </VStack>

              {/* Recommendations */}
              {seed && (
                <VStack align="start" gap={3} w="full">
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" fontWeight="600" color="gray.600">
                      Similar Posts
                      <Text as="span" fontSize="xs" fontWeight="400" color="gray.400" ml={2}>
                        frontend mockup using search results
                      </Text>
                    </Text>
                    <Button
                      size="xs"
                      variant={sameClusterOnly ? 'solid' : 'outline'}
                      bg={sameClusterOnly ? 'blue.500' : 'transparent'}
                      color={sameClusterOnly ? 'white' : 'gray.600'}
                      borderColor={sameClusterOnly ? 'blue.500' : 'gray.200'}
                      onClick={() => setSameClusterOnly((v) => !v)}
                      _hover={{ bg: sameClusterOnly ? 'blue.600' : 'gray.50' }}
                      px={3}
                    >
                      Same topic only
                    </Button>
                  </HStack>
                  <Separator />
                  {recommendations.length === 0 ? (
                    <Box w="full" py={6} textAlign="center">
                      <Text color="gray.400" fontSize="sm">
                        No other posts in this topic from the current search results
                      </Text>
                    </Box>
                  ) : (
                    recommendations.map((r, i) => (
                      <RecommendationCard key={r.id} result={r} rank={i + 1} />
                    ))
                  )}
                </VStack>
              )}
            </VStack>
          </HStack>
        )}

        {/* Empty state before first search */}
        {!searched && !loading && (
          <Box w="full" py={10} textAlign="center">
            <FiSearch size={36} color="#CBD5E0" style={{ margin: '0 auto 12px' }} />
            <Text color="gray.400" fontSize="sm">Search for posts to get started</Text>
            <Text color="gray.300" fontSize="xs" mt={1}>
              Try topics like "job market", "public transport", "HDB BTO"
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
