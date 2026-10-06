import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { StickyNoteWindow } from "./views/StickyNoteWindow";
import "./index.css";

const stickyNoteId = new URLSearchParams(window.location.search).get("sticky");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {stickyNoteId ? <StickyNoteWindow noteId={stickyNoteId} /> : <App />}
  </React.StrictMode>,
);
