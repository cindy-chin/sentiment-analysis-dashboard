import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiClock, FiSmile, FiSearch } from 'react-icons/fi';

const NAV_ITEMS = [
  { label: 'Overview', path: '/', icon: FiHome },
  { label: 'Timeline', path: '/timeline', icon: FiClock },
  { label: 'Sentiment Analysis', path: '/emotions', icon: FiSmile },
  { label: 'Document Search', path: '/search', icon: FiSearch },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <Box
      bg="linear-gradient(90deg, #E0F0FF 0%, #F0FFF4 100%)"
      borderBottomWidth="1px"
      borderColor="green.100"
      px={6}
      py={3}
      position="sticky"
      top={0}
      zIndex={10}
      backdropFilter="blur(8px)"
    >
      <Flex maxW="1400px" mx="auto" align="center" justify="space-between">
        <Link to="/">
          <HStack gap={2}>
            <Text fontSize="lg" fontWeight="bold" bgGradient="to-r" gradientFrom="blue.600" gradientTo="green.500" bgClip="text">
              🇸🇬 SG Sentiment
            </Text>
          </HStack>
        </Link>

        <HStack gap={1}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const IconComp = item.icon;
            return (
              <Link to={item.path} key={item.path}>
                <HStack
                  px={3}
                  py={2}
                  rounded="md"
                  fontSize="sm"
                  fontWeight={isActive ? '600' : '400'}
                  color={isActive ? 'blue.700' : 'gray.600'}
                  bg={isActive ? 'blue.50' : 'transparent'}
                  _hover={{ bg: 'green.50' }}
                  gap={1.5}
                >
                  <IconComp size={16} />
                  <Text>{item.label}</Text>
                </HStack>
              </Link>
            );
          })}
        </HStack>
      </Flex>
    </Box>
  );
}
