/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      // Airport-signage world of the analysis page (.impeccable/surfaces)
      colors: {
        ground: "#eceae4",
        sign: "#ffcc00",
        ink: "#161616",
        line: "#d6d3cb",
        muted: "#5c5c58",
        flag: "#a3200f",
      },
      fontFamily: {
        sign: ["OpenSans", "system-ui", "sans-serif"],
      },
    },
  },
  corePlugins: {
    aspectRatio: false,
  },
  plugins: [
    require("tailwind-scrollbar")({ nocompatible: true }),
    require("@tailwindcss/aspect-ratio"),
  ],
};
