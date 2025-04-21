module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,js,ts}",
    "./public/index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: ["@tailwindcss/postcss"],
}