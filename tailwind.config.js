import forms from '@tailwindcss/forms'
import containerQueries from '@tailwindcss/container-queries'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Borders
        'outline-variant':             '#cfd5d6',  // --line, subtle dividers
        'outline':                     '#b8c8d8',  // visible borders

        // Primary — Everscale forest green
        'primary':                     '#1f6d44',
        'on-primary':                  '#ffffff',
        'primary-container':           '#dfeadd',  // --green-pale
        'on-primary-container':        '#0a2b1a',
        'primary-fixed':               '#dfeadd',
        'primary-fixed-dim':           '#81b927',  // --green-bright
        'on-primary-fixed':            '#071d47',
        'on-primary-fixed-variant':    '#1f6d44',
        'surface-tint':                '#1f6d44',
        'inverse-primary':             '#81b927',

        // Secondary — Everscale navy
        'secondary':                   '#0b2a58',  // --navy-2
        'on-secondary':                '#ffffff',
        'secondary-container':         '#e8eef2',  // --mist
        'on-secondary-container':      '#071d47',
        'secondary-fixed':             '#c8d4e8',
        'secondary-fixed-dim':         '#a0b4cc',
        'on-secondary-fixed':          '#071d47',
        'on-secondary-fixed-variant':  '#0b2a58',

        // Tertiary — slate
        'tertiary':                    '#4e5c70',  // --slate
        'on-tertiary':                 '#ffffff',
        'tertiary-container':          '#cce0f0',
        'on-tertiary-container':       '#071d47',
        'tertiary-fixed':              '#cce0f0',
        'tertiary-fixed-dim':          '#67add2',  // --digital-blue
        'on-tertiary-fixed':           '#071d47',
        'on-tertiary-fixed-variant':   '#0b2a58',

        // Surfaces
        'background':                  '#f7f9fb',  // --paper (page bg)
        'on-background':               '#10284d',  // --ink
        'surface':                     '#f7f9fb',  // --paper
        'surface-dim':                 '#eef3f7',  // --paper-2
        'surface-bright':              '#ffffff',
        'surface-variant':             '#eef3f7',
        'surface-container-lowest':    '#c6dff2',  // cards — light blue
        'surface-container-low':       '#4e5c70',  // section bg — slate
        'surface-container':           '#b8d5ec',  // inner card containers
        'surface-container-high':      '#a8cae7',  // card headers / highlighted
        'surface-container-highest':   '#97bee1',  // most highlighted

        // On-surface text
        'on-surface':                  '#10284d',  // --ink
        'on-surface-variant':          '#4e5c70',  // --slate

        // Inverse
        'inverse-surface':             '#071d47',  // --navy
        'inverse-on-surface':          '#f7f9fb',

        // Error
        'error':                       '#ba1a1a',
        'on-error':                    '#ffffff',
        'error-container':             '#ffdad6',
        'on-error-container':          '#410002',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        '2xl': '0.75rem',
        full: '9999px',
      },
      fontFamily: {
        headline: ['"IBM Plex Sans"', 'sans-serif'],
        body:     ['"IBM Plex Sans"', 'sans-serif'],
        label:    ['"IBM Plex Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [forms, containerQueries],
}
