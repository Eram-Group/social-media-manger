/** @type {import('tailwindcss').Config} */
const tailwindAnimate = require('tailwindcss-animate');
const tailwindScrollbarHide = require('tailwind-scrollbar-hide');

module.exports = {
  darkMode: ['class'],
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      Montserrat: ['Montserrat', 'sans-serif'],
      Poppins: ['Poppins', 'sans-serif'],
      Sora: ['Sora', 'sans-serif'],
    },
    extend: {
      colors: {
        primary: {
          100: '#F7FBFF', 150: '#EBF5FF', 200: '#DEEBFA', 300: '#C6DCF5', 400: '#ADCCF0',
          500: '#95BDEB', 600: '#649DE0', 700: '#337ED6', 800: '#025FCC', 900: '#024CA3',
          1000: '#01397A', 1100: '#012652', 1200: '#011C3D', 1300: '#001329', 1400: '#000914',
        },
        secondary: {
          100: '#FFFFFF', 200: '#EDFBFF', 300: '#DCF7FE', 400: '#CAF3FE', 500: '#B8EFFE',
          600: '#95E6FD', 700: '#71DEFD', 800: '#4ED6FC', 900: '#3FB0D0', 1000: '#2F8BA5',
          1100: '#206579', 1200: '#185263', 1300: '#10404E', 1400: '#092D38',
        },
        accent: {
          100: '#FDF9E5', 200: '#FDF9E5', 300: '#FCF3CC', 400: '#FAEEB2', 500: '#F9E899',
          600: '#F6DC66', 700: '#F3D133', 800: '#F0C500', 900: '#C09E00', 1000: '#907600',
          1100: '#604F00', 1200: '#483B00', 1300: '#302700', 1400: '#181400',
        },
        neutral: {
          100: '#F1F1F1', 200: '#E3E3E3', 300: '#D6D6D6', 400: '#C8C8C8', 500: '#ACACAC',
          600: '#919191', 700: '#757575', 800: '#5E5E5E', 900: '#464646', 1000: '#2F2F2F',
          1100: '#232323', 1200: '#171717', 1300: '#0C0C0C',
        },
        surface: { background: '#FAFCFF', white: '#FFFFFF' },
        text: {
          medium: '#737373', dark: '#000A14', darker: '#3B3B3B', red: '#D50415',
          light_red: '#FDA29B', green: '#00A87E', 'icon-side-menu-color': '#64708F',
        },
        icon: { white: '#FFFFFF', grey: '#4B4B4B', dark: '#001329' },
        warnings: {
          caution: '#B54708', cautionBg: '#FFFAEB', alert: '#D50415',
          success: '#00A87E', successBg: '#ECFDF3',
        },
        stroke: { Primary: { light: '#C6D8ED' } },
      },
      screens: { x: '1440px' },
      backgroundImage: {
        'button-gradient': 'linear-gradient(0deg, #024CA3 0%, #025FCC 100%)',
        'border-gradient': 'linear-gradient(90.35deg, #025FCC 0.31%, #01397A 103.61%);',
      },
      boxShadow: {
        1: '0px 1px 4px 0px #0000004D;',
        2: '0px 1px 8px 0px #0000004D;',
        3: '1px 2px 2px 0px #0000001F;',
        4: '0px 1px 4px 0px #0000001F;',
        5: '0px 0px 0px 2px #2F2F2F1A;',
        6: '0px 1px 2px 0px #0A0D120D;',
        7: '0px 4px 14px 0px rgba(0, 0, 0, 0.05)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindAnimate, tailwindScrollbarHide],
};
