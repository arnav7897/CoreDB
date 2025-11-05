import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import CoreDBTeam from "./ourteam"; // adjust the path if needed
import reportWebVitals from "./reportWebVitals";

// Optional: Lazy load pages for better performance
// const CoreDBTeam = React.lazy(() => import("./pages/CoreDBTeam"));

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/team" element={<CoreDBTeam />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

// Performance reporting (optional)
reportWebVitals();
