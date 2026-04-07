import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#EBF5FF' },
          100: { value: '#D0E8FF' },
          200: { value: '#A3D1FF' },
          300: { value: '#6BB5FF' },
          400: { value: '#3D9AFF' },
          500: { value: '#2B7DE9' },
          600: { value: '#1E5FB3' },
          700: { value: '#144080' },
          800: { value: '#0B2650' },
          900: { value: '#041020' },
        },
        accent: {
          50: { value: '#F0FFF4' },
          100: { value: '#C6F6D5' },
          200: { value: '#9AE6B4' },
          300: { value: '#68D391' },
          400: { value: '#48BB78' },
          500: { value: '#38A169' },
          600: { value: '#2F855A' },
          700: { value: '#276749' },
          800: { value: '#22543D' },
          900: { value: '#1C4532' },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, config);

export default system;

