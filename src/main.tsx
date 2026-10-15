import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { seed } from "./db/database";
import App from "./app/App";
import "./style.css";
async function start() {
  await seed();
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
    </React.StrictMode>,
  );
}
void start();
