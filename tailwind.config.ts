import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f14",
        panel: "#131a22",
        border: "#233240",
        accent: "#4f9dff",
        danger: "#ff6161",
      },
    },
  },
  plugins: [],
};

export default config;
