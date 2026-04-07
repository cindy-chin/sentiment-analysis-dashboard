import { useMemo } from 'react';
import {
  Box, Heading, Text, VStack, SimpleGrid, Card, CardBody, CardHeader,
  Stat, StatLabel, StatValueText, Badge, HStack,
  Table, TableHeader, TableBody, TableRow, TableCell, TableColumnHeader,
  TableScrollArea, Spinner,
} from '@chakra-ui/react';
import { useData } from '../data/api';

export default function MethodComparison() {
  const { comparisonData, TOPIC_COLORS, loading, error } = useData();

  const tfidf = comparisonData?.tfidf || {};
  const bm25 = comparisonData?.bm25 || {};

  const bm25Clusters = useMemo(() =>
    [...(bm25.clusters || [])].sort((a, b) => b.count - a.count),
    [bm25]
  );

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /><Text mt={4}>Loading...</Text></Box>;
  if (error) return <Box textAlign="center" py={20}><Text color="red.500">Error: {error}</Text></Box>;

  return (
    <Box>
      <VStack align="start" gap={1} mb={6}>
        <Heading size="lg" bgGradient="to-r" gradientFrom="blue.600" gradientTo="green.500" bgClip="text">Method Comparison</Heading>
        <Text color="gray.600">
          Comparing topic clusters discovered by TF-IDF and BM25 vectorisation — validating robustness of clustering results.
        </Text>
      </VStack>

      {/* Method summary cards */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} mb={8}>
        {[tfidf, bm25].map((method, idx) => (
          <Card.Root key={method.method} bg={idx === 0 ? 'linear-gradient(135deg, #EBF5FF 0%, #E0F0FF 100%)' : 'linear-gradient(135deg, #F0FFF4 0%, #C6F6D5 100%)'} borderWidth="1px" borderColor={idx === 0 ? 'blue.100' : 'green.100'}>
            <CardHeader>
              <Heading size="md" color={idx === 0 ? 'blue.700' : 'green.700'}>{method.method}</Heading>
            </CardHeader>
            <CardBody pt={0}>
              <SimpleGrid columns={1} gap={4}>
                <Stat.Root>
                  <StatLabel>Clusters</StatLabel>
                  <StatValueText>{method.nClusters}</StatValueText>
                </Stat.Root>
              </SimpleGrid>
            </CardBody>
          </Card.Root>
        ))}
      </SimpleGrid>

      {/* Cluster tables */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        {/* TF-IDF */}
        <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
          <CardHeader pb={2}>
            <HStack justify="space-between">
              <Heading size="sm" color="blue.700">TF-IDF Clusters ({tfidf.nClusters})</Heading>
              <Badge colorPalette="blue">K-Means k={tfidf.nClusters}</Badge>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <TableScrollArea>
              <Table.Root size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>#</TableColumnHeader>
                    <TableColumnHeader>Topic</TableColumnHeader>
                    <TableColumnHeader textAlign="end">Posts</TableColumnHeader>
                    <TableColumnHeader>Keywords</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tfidf.clusters.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Box w={3} h={3} rounded="full" bg={TOPIC_COLORS[c.id % TOPIC_COLORS.length]} />
                      </TableCell>
                      <TableCell fontWeight="medium" fontSize="sm">{c.label}</TableCell>
                      <TableCell textAlign="end">{c.size.toLocaleString()}</TableCell>
                      <TableCell>
                        <Text fontSize="xs" color="gray.500" lineClamp={1}>
                          {c.keywords.join(', ')}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table.Root>
            </TableScrollArea>
          </CardBody>
        </Card.Root>

        {/* BM25 */}
        <Card.Root bg="white" borderWidth="1px" borderColor="green.50">
          <CardHeader pb={2}>
            <HStack justify="space-between">
              <Heading size="sm" color="green.600">BM25 Clusters ({bm25.nClusters})</Heading>
              <Badge colorPalette="green">K-Means k={bm25.nClusters}</Badge>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <TableScrollArea maxH="500px" overflowY="auto">
              <Table.Root size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Topic</TableColumnHeader>
                    <TableColumnHeader textAlign="end">Posts</TableColumnHeader>
                    <TableColumnHeader>Top Keywords</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bm25Clusters.map((c) => (
                    <TableRow key={c.cluster}>
                      <TableCell fontWeight="medium" fontSize="sm">
                        <HStack gap={2}>
                          <Box w={3} h={3} rounded="full" bg={TOPIC_COLORS[c.cluster % TOPIC_COLORS.length]} />
                          <Text>{c.label || `Cluster ${c.cluster}`}</Text>
                        </HStack>
                      </TableCell>
                      <TableCell textAlign="end">{c.count.toLocaleString()}</TableCell>
                      <TableCell>
                        <Text fontSize="xs" color="gray.500" lineClamp={1}>
                          {(c.keywords || []).slice(0, 5).join(', ')}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table.Root>
            </TableScrollArea>
          </CardBody>
        </Card.Root>
      </SimpleGrid>
    </Box>
  );
}
