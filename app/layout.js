// app/layout.js — Passthrough root layout
// <html> en <body> staan in app/[locale]/layout.js voor correct lang attribuut
import "./globals.css";

export default function RootLayout({ children }) {
  return children;
}
