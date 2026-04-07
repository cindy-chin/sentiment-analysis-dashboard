import { useMemo } from 'react';
import {
  Box, Heading, Text, VStack, Card, CardBody, CardHeader,
  HStack, Badge, Spinner,
  Table, TableHeader, TableBody, TableRow, TableCell, TableColumnHeader,
  TableScrollArea,
} from '@chakra-ui/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useData } from '../data/api';

const TIMELINE_COLORS = [
  '#3D9AFF', '#E87FB8', '#6BB5FF', '#F2A0CE',
  '#2B7DE9', '#D4549A', '#A3D1FF',
];

export default function Timeline() {
  const { timelineData, TOPIC_COLORS, loading, error } = useData();

  const { stacked = [], details = [], clusterLabels = {} } = timelineData || {};

  const clusterKeys = useMemo(() =>
    Object.keys(clusterLabels).sort((a, b) => Number(a) - Number(b)),
    [clusterLabels]
  );

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /><Text mt={4}>Loading...</Text></Box>;
  if (error) return <Box textAlign="center" py={20}><Text color="red.500">Error: {error}</Text></Box>;

  return (
    <Box>
      <VStack align="start" gap={1} mb={6}>
        <Heading size="lg" bgGradient="to-r" gradientFrom="blue.600" gradientTo="pink.500" bgClip="text">
          Topic Timeline
        </Heading>
        <Text color="gray.600">
          Posts are grouped into 7 topics using K-Means clustering. This page shows how the volume of each topic changed month by month.
        </Text>
      </VStack>

      {/* Stacked area chart */}
      <Card.Root mb={6} bg="white" borderWidth="1px" borderColor="blue.50">
        <CardHeader pb={0}>
          <Heading size="sm" color="blue.700">Monthly Topic Volume</Heading>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={stacked}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis />
              <Tooltip
                contentStyle={{ fontSize: '12px' }}
                formatter={(value, name) => {
                  const cid = name.replace('cluster_', '');
                  return [value, clusterLabels[cid] || `Cluster ${cid}`];
                }}
              />
              {clusterKeys.map((cid) => (
                <Area
                  key={cid}
                  type="monotone"
                  dataKey={`cluster_${cid}`}
                  stackId="1"
                  fill={TIMELINE_COLORS[Number(cid) % TIMELINE_COLORS.length]}
                  stroke={TIMELINE_COLORS[Number(cid) % TIMELINE_COLORS.length]}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card.Root>

      {/* Month-by-month summary table */}
      <Card.Root bg="white" borderWidth="1px" borderColor="blue.50">
        <CardHeader pb={2}>
          <Heading size="sm" color="blue.700">Monthly Summary</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <TableScrollArea>
            <Table.Root size="sm">
              <TableHeader>
                <TableRow>
                  <TableColumnHeader>Month</TableColumnHeader>
                  <TableColumnHeader textAlign="end">Posts</TableColumnHeader>
                  <TableColumnHeader>Most Discussed Topic</TableColumnHeader>
                  <TableColumnHeader textAlign="end">Share</TableColumnHeader>
                  <TableColumnHeader>2nd Most Discussed</TableColumnHeader>
                  <TableColumnHeader textAlign="end">Share</TableColumnHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((d) => {
                  const top1 = d.clusters[0];
                  const top2 = d.clusters[1];
                  return (
                    <TableRow key={d.monthKey}>
                      <TableCell fontWeight="600" color="blue.700">{d.month}</TableCell>
                      <TableCell textAlign="end">{d.totalPosts.toLocaleString()}</TableCell>
                      <TableCell>
                        <HStack gap={2}>
                          <Box w={3} h={3} rounded="full" bg={TIMELINE_COLORS[top1?.cluster % TIMELINE_COLORS.length]} flexShrink={0} />
                          <Text fontSize="sm">{top1?.label}</Text>
                        </HStack>
                      </TableCell>
                      <TableCell textAlign="end">
                        <Badge colorPalette="blue" variant="subtle" size="sm">{top1?.pct}%</Badge>
                      </TableCell>
                      <TableCell>
                        {top2 && (
                          <HStack gap={2}>
                            <Box w={3} h={3} rounded="full" bg={TIMELINE_COLORS[top2?.cluster % TIMELINE_COLORS.length]} flexShrink={0} />
                            <Text fontSize="sm">{top2?.label}</Text>
                          </HStack>
                        )}
                      </TableCell>
                      <TableCell textAlign="end">
                        {top2 && <Badge colorPalette="pink" variant="subtle" size="sm">{top2?.pct}%</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table.Root>
          </TableScrollArea>
        </CardBody>
      </Card.Root>
    </Box>
  );
}
