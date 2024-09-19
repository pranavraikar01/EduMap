// App.js
import React from "react";
import MindMap from "./components/Mindmap";
import "@xyflow/react/dist/style.css";

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <MindMap />
    </div>
  );
}
