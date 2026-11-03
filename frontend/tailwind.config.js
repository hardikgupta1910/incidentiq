/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0D10",
        sidebar: "#111419",
        surface: "#171B22",
        elevated: "#1D232C",
        line: "#29313B",
        accent: "#638BFF",
        "accent-hover": "#7DA0FF",
        "text-primary": "#F1F5F9",
        "text-secondary": "#94A3B8",
        "text-muted": "#64748B",
        success: "#22C55E",
        warning: "#F59E0B",
        critical: "#EF4444",
        info: "#38BDF8",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        DEFAULT: "6px",
        lg: "8px",
        xl: "10px",
      },
    },
  },
  plugins: [],
};
