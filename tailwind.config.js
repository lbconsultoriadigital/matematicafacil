/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './super_tutor_de_matem_tica .tsx'],
  theme: {
    extend: {
      colors: {
        slate: {
          750: '#263449',
          850: '#172033',
        },
      },
    },
  },
  plugins: [],
};
