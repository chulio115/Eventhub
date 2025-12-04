module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        immomio: {
          azure: '#3486EF', // Primary
          indigo: '#193F70', // Primary (dunkler Ton)
          softBlue: '#D1F0F8',
          bright: '#8EC3FF',
          lilac: '#5538D7',
          aqua: '#A2EEFF',
          petrol: '#0088B0',
          warmRed: '#FF6450',
        },
        // Kurz-Alias für Hauptbrandfarbe
        brand: {
          DEFAULT: '#3486EF',
          soft: '#D1F0F8',
          bright: '#8EC3FF',
          dark: '#193F70',
          accent: '#FF6450',
        },
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
};
