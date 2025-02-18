import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MindMap from "./MindMap"; // Import the MindMap component
import Navbar from "./Navbar";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log(API_KEY); // Logs your API key from the .env file

const genAI = new GoogleGenerativeAI(API_KEY);

function Sample() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState("");
  const [skeleton, setSkeleton] = useState(null); // To store the generated skeleton
  const [description, setDescription] = useState(""); // For the mind map description
  const [successMessage, setSuccessMessage] = useState(""); // For showing success or error messages
  const [loading, setLoading] = useState(false); // Loading state for the loader

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true); // Start the loader

    try {
      const response = await fetch("http://localhost:5000/extract-text", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedText(data.text); // Store extracted text in state
        setError("");
        await handleOpenAICall(data.text); // Send extracted text to Gemini API
      } else {
        setError("Error in extracting text");
      }
    } catch (error) {
      console.error("API error:", error);
      setError("An error occurred");
    } finally {
      setLoading(false); // End the loader
    }
  };

  const handleOpenAICall = async (extractedText) => {
    setLoading(true); // Start the loader for the Gemini API call

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Based on the data given in:\n ${extractedText}, generate a structured mind map skeleton.
            The heirarchy must resemble to following structure: example childNodes = {
  1: [
    { id: "2", data: { label: "Thallophyta" }, type: "editableNode" },
    { id: "3", data: { label: "Bryophyta" }, type: "editableNode" },
    { id: "4", data: { label: "Pteridophyta" }, type: "editableNode" },
    { id: "5", data: { label: "Gymnosperms" }, type: "editableNode" },
    { id: "6", data: { label: "Angiosperms" }, type: "editableNode" },
  ],
  2: [
    { id: "7", data: { label: "Algae" }, type: "editableNode" },
    { id: "8", data: { label: "Fungi" }, type: "editableNode" },
  ],
  3: [
    { id: "9", data: { label: "Mosses" }, type: "editableNode" },
    { id: "10", data: { label: "Liverworts" }, type: "editableNode" },
  ],
  4: [
    { id: "11", data: { label: "Ferns" }, type: "editableNode" },
    { id: "12", data: { label: "Horsetails" }, type: "editableNode" },
  ],
  5: [
    { id: "13", data: { label: "Cycads" }, type: "editableNode" },
    { id: "14", data: { label: "Conifers" }, type: "editableNode" },
    { id: "15", data: { label: "Gnetophytes" }, type: "editableNode" },
  ],
  6: [
    { id: "16", data: { label: "Monocots" }, type: "editableNode" },
    { id: "17", data: { label: "Dicots" }, type: "editableNode" },
  ],
}. since it needs to map on a UI for mindmap generation Give the complete object and dont give any extra stuff just give the skeleton.Be Precise.Give upto 5 levels of heirarchy.
      Please return the JSON object only.`;

      const result = await model.generateContent([prompt]);
      const response = await result.response;
      const text = await response.text();

      // Clean the response by removing any unnecessary characters or code blocks
      const jsonString = text.replace(/```json|```/g, "").trim();

      // Parse the cleaned string into JSON
      const skeleton = JSON.parse(jsonString);
      setSkeleton(skeleton);
      console.log("Skeleton:", skeleton);
    } catch (error) {
      console.error("Gemini API error:", error);
      setError("An error occurred while generating the skeleton");
    } finally {
      setLoading(false); // End the loader
    }
  };

  const saveMindMap = async () => {
    if (!skeleton) {
      setError("No mind map to save");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3000/api/v1/mindmaps/Mindmap",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": localStorage.getItem("token"),
          },
          body: JSON.stringify({
            date: new Date().toISOString(),
            mindmapObject: skeleton,
            description: description,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setSuccessMessage("Mind map saved successfully!");
        alert("Successfully saved");
        setError("");
      } else {
        setError("Failed to save mind map");
      }
    } catch (error) {
      console.error("Save mind map error:", error);
      setError("An error occurred while saving the mind map");
    }
  };

  return (
    <div style={styles.container}>
      <Navbar />
      <h1>PDF Text Extractor & Mind Map Generator</h1>
      <input type="file" onChange={handleFileChange} /> <br />
      <button onClick={handleFileUpload}>Upload and Extract Text</button>
      {loading && <div style={styles.loader}>Loading...</div>}{" "}
      {/* Loader here */}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
      {extractedText && (
        <div>
          <h2>Extracted Text:</h2>
          <div style={styles.extractedTextBox}>
            <pre style={styles.preformattedText}>{extractedText}</pre>
          </div>
        </div>
      )}
      {skeleton && (
        <div>
          <h2>Generated Mind Map:</h2>
          <div style={{ width: "100vw", height: "100vh" }}>
            <MindMap
              skeleton={skeleton}
              extractedText={extractedText}
              description={""}
              isDarkMode={true}
            />
          </div>
          <div style={styles.descriptionContainer}>
            <input
              type="text"
              placeholder="Enter description for mind map"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.descriptionInput}
            />
          </div>
          <button onClick={saveMindMap}>Save Mind Map</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    padding: "20px",
  },
  loader: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "blue",
  },
  extractedTextBox: {
    display: "inline-block",
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    marginTop: "10px",
    maxHeight: "400px",
    maxWidth: "700px",
    overflowY: "auto",
    textAlign: "center",
  },
  preformattedText: {
    textAlign: "center",
  },
  descriptionContainer: {
    marginTop: "20px",
    textAlign: "center",
  },
  descriptionInput: {
    width: "300px",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
};

export default Sample;
