import { Box, Flex, Text } from '@chakra-ui/react';

export default function WordCloud({ words, maxFontSize = 36, minFontSize = 12 }) {
  if (!words || words.length === 0) return null;

  const maxVal = Math.max(...words.map((w) => w.value));
  const minVal = Math.min(...words.map((w) => w.value));
  const range = maxVal - minVal || 1;

  const shuffled = [...words].sort(() => Math.random() - 0.5);

  return (
    <Box p={4} bg="linear-gradient(135deg, #F8FBFF 0%, #F0FFF4 100%)" rounded="xl" borderWidth="1px" borderColor="blue.50">
      <Flex flexWrap="wrap" gap={2} justify="center" align="center">
        {shuffled.map((word) => {
          const size = minFontSize + ((word.value - minVal) / range) * (maxFontSize - minFontSize);
          const opacity = 0.55 + ((word.value - minVal) / range) * 0.45;
          const colors = ['blue.600', 'green.500', 'blue.500', 'green.400', 'blue.700', 'green.600', 'blue.400'];
          const colorIdx = word.text.length % colors.length;
          return (
            <Text
              key={word.text}
              fontSize={`${size}px`}
              fontWeight={size > 24 ? 'bold' : 'medium'}
              color={colors[colorIdx]}
              opacity={opacity}
              cursor="default"
              _hover={{ opacity: 1, transform: 'scale(1.1)' }}
              transition="all 0.2s"
            >
              {word.text}
            </Text>
          );
        })}
      </Flex>
    </Box>
  );
}
