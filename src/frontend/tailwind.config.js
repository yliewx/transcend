module.exports = {
  content: [
    "./src/**/*.{html,js,ts,css}",
    "./public/index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: ["@tailwindcss/postcss"],
}