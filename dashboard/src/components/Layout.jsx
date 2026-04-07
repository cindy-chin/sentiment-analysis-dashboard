import { Box } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <Box minH="100vh" bg="linear-gradient(135deg, #EBF5FF 0%, #F0FFF4 50%, #F0F4FF 100%)">
      <Navbar />
      <Box maxW="1400px" mx="auto" px={6} py={6}>
        <Outlet />
      </Box>
    </Box>
  );
}
