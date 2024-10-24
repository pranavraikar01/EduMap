// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sample from "./components/Sample";
import Home from "./components/Home"; // Import your Home component
import "@xyflow/react/dist/style.css";
import Login from "./components/Login";
import MyMindMaps from "./components/MyMindmaps";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Define the Home route */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Define the Sample route */}
        <Route path="/mindmap" element={<Sample />} />
        <Route path="/my-mindmaps" element={<MyMindMaps />} />
      </Routes>
    </Router>
  );
}
