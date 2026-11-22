import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Landing } from "./Landing";
// The actual app's stylesheet: same tokens, same classes, same fonts.
// Nothing here is reskinned; the marketing page is a guest in Notes's
// own design system, not a lookalike of it.
import "../src/styles/index.css";
import "./landing.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
);
