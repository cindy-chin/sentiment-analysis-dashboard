import { useState } from 'react';
import {
  Box, Heading, Text, VStack, HStack, Input, Button, Card, CardBody,
  Badge, Spinner, SimpleGrid, Stat, StatLabel, StatValueText,
  Separator,
} from '@chakra-ui/react';
import { FiSearch, FiFileText, FiArrowUp, FiMessageSquare } from 'react-icons/fi';

const API_BASE = '/api';

const METHOD_OPTIONS = [
  { value: 'bm25', label: 'BM25', description: 'Probabilistic term matching' },
  { value: 'tfidf', label: 'TF-IDF', description: 'Cosine similarity' },
];

const CLUSTER_COLORS = [
  '#3D9AFF', '#38A169', '#6BB5FF', '#68D391', '#2B7DE9', '#2F855A',
  '#A3D1FF', '#F6AD55', '#FC8181', '#B794F4', '#63B3ED', '#F687B3',
  '#4FD1C5', '#FBD38D', '#9AE6B4', '#D53F8C', '#ED8936', '#667EEA',
  '#48BB78', '#E53E3E',
];

function RelevanceBar({ score }) {
  return (
    <Box w="80px" h="6px" bg="gray.100" rounded="full" overflow="hidden">
      <Box h="full" bg="blue.400" rounded="full" style={{ width: `${Math.round(score * 100)}%` }} />
    </Box>
  );
}

function ResultCard({ result, rank }) {
  const clusterColor = CLUSTER_COLORS[result.cluster % CLUSTER_COLORS.length];
  return (
    <Card.Root size="sm" border="1px solid" borderColor="gray.100" _hover={{ borderColor: 'blue.200', shadow: 'sm' }}>
      <CardBody p={4}>
        <HStack justify="space-between" align="flex-start" gap={3}>
          <HStack align="flex-start" gap={3} flex={1} minW={0}>
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
                <Badge
                  size="sm"
                  px={2}
                  py={0.5}
                  rounded="full"
                  fontSize="xs"
                  style={{ backgroundColor: clusterColor + '22', color: clusterColor, borderColor: clusterColor + '44', borderWidth: '1px' }}
                >
                  {result.clusterLabel}
                </Badge>
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
          </HStack>
          <VStack align="end" gap={1} minW="70px">
            <Text fontSize="xs" color="gray.500" fontWeight="600">
              {(result.relevanceScore * 100).toFixed(1)}%
            </Text>
            <RelevanceBar score={result.relevanceScore} />
          </VStack>
        </HStack>
      </CardBody>
    </Card.Root>
  );
}

export default function DocumentSearch() {
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('bm25');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&method=${method}&k=20`);
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

  const avgRelevance = results.length
    ? (results.reduce((s, r) => s + r.relevanceScore, 0) / results.length * 100).toFixed(1)
    : 0;

  const topCluster = results.length
    ? (() => {
        const freq = {};
        results.forEach((r) => { freq[r.clusterLabel] = (freq[r.clusterLabel] || 0) + 1; });
        return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      })()
    : '—';

  return (
    <Box maxW="900px" mx="auto" px={4} py={6}>
      <VStack align="start" gap={6}>
        {/* Header */}
        <VStack align="start" gap={1}>
          <HStack gap={2}>
            <FiSearch size={20} color="#3D9AFF" />
            <Heading size="lg" color="gray.800">Document Search</Heading>
          </HStack>
          <Text fontSize="sm" color="gray.500">
            Search ~31,900 r/Singapore posts using BM25 or TF-IDF retrieval
          </Text>
        </VStack>

        {/* Search bar */}
        <Card.Root w="full" border="1px solid" borderColor="blue.100" shadow="sm">
          <CardBody p={4}>
            <VStack gap={3}>
              <HStack w="full" gap={2}>
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
                  colorScheme="blue"
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

              {/* Method toggle */}
              <HStack gap={2} w="full">
                <Text fontSize="xs" color="gray.500" fontWeight="600">Method:</Text>
                {METHOD_OPTIONS.map((m) => (
                  <Button
                    key={m.value}
                    size="xs"
                    variant={method === m.value ? 'solid' : 'outline'}
                    bg={method === m.value ? 'blue.500' : 'transparent'}
                    color={method === m.value ? 'white' : 'gray.600'}
                    borderColor={method === m.value ? 'blue.500' : 'gray.200'}
                    onClick={() => setMethod(m.value)}
                    _hover={{ bg: method === m.value ? 'blue.600' : 'gray.50' }}
                    px={3}
                  >
                    {m.label}
                    <Text as="span" fontSize="10px" opacity={0.8} ml={1}>— {m.description}</Text>
                  </Button>
                ))}
              </HStack>
            </VStack>
          </CardBody>
        </Card.Root>

        {/* Stats row */}
        {searched && !loading && results.length > 0 && (
          <SimpleGrid columns={{ base: 3 }} gap={3} w="full">
            <Card.Root size="sm" border="1px solid" borderColor="gray.100">
              <CardBody p={3}>
                <Stat.Root>
                  <StatLabel fontSize="xs" color="gray.500">Results</StatLabel>
                  <StatValueText fontSize="xl" color="blue.600">{results.length}</StatValueText>
                </Stat.Root>
              </CardBody>
            </Card.Root>
            <Card.Root size="sm" border="1px solid" borderColor="gray.100">
              <CardBody p={3}>
                <Stat.Root>
                  <StatLabel fontSize="xs" color="gray.500">Avg Relevance</StatLabel>
                  <StatValueText fontSize="xl" color="green.600">{avgRelevance}%</StatValueText>
                </Stat.Root>
              </CardBody>
            </Card.Root>
            <Card.Root size="sm" border="1px solid" borderColor="gray.100">
              <CardBody p={3}>
                <Stat.Root>
                  <StatLabel fontSize="xs" color="gray.500">Top Cluster</StatLabel>
                  <Text fontSize="sm" fontWeight="700" color="gray.700" lineClamp={1}>{topCluster}</Text>
                </Stat.Root>
              </CardBody>
            </Card.Root>
          </SimpleGrid>
        )}

        {/* Loading */}
        {loading && (
          <HStack justify="center" w="full" py={10}>
            <Spinner size="lg" color="blue.400" />
            <Text color="gray.500" fontSize="sm">Searching with {method.toUpperCase()}…</Text>
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

        {/* Results */}
        {!loading && results.length > 0 && (
          <VStack gap={2} w="full" align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.500">
                Top {results.length} results for <Text as="span" fontWeight="600" color="gray.700">"{lastQuery}"</Text>
                {' '}via <Badge colorScheme="blue" size="sm">{method.toUpperCase()}</Badge>
              </Text>
            </HStack>
            <Separator />
            {results.map((r, i) => (
              <ResultCard key={r.id} result={r} rank={i + 1} />
            ))}
          </VStack>
        )}

        {/* Empty state before first search */}
        {!searched && !loading && (
          <Box w="full" py={10} textAlign="center">
            <FiSearch size={36} color="#CBD5E0" style={{ margin: '0 auto 12px' }} />
            <Text color="gray.400" fontSize="sm">Enter a query above to search Reddit posts</Text>
            <Text color="gray.300" fontSize="xs" mt={1}>Try topics like "job market", "public transport", "HDB BTO"</Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
