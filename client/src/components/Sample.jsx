import React, { useState, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MindMap from "./MindMap";
import Navbar from "./Navbar";
import styles from "./Sample.module.css";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

function Sample() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState("");
  const [skeleton, setSkeleton] = useState(null);
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const fileInputRef = useRef(null);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.style.backgroundColor = isDarkMode ? "#ffffff" : "#1a202c";
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/extract-text", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedText(data.text);
        setError("");
        await handleOpenAICall(data.text);
      } else {
        setError("Error in extracting text");
      }
    } catch (error) {
      console.error("API error:", error);
      setError("An error occurred");
    } finally {
      setLoading(false);
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
    <div className={`${styles.container} ${isDarkMode ? styles.dark : ""}`}>
      <Navbar />
      <button onClick={toggleDarkMode} className={styles.darkModeToggle}>
        {isDarkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>

      <h1 style={{ color: isDarkMode ? "white" : "black" }}>
        PDF Text Extractor & Mind Map Generator
      </h1>

      <div
        className={`${styles.fileDropArea} ${
          dragActive ? styles.dragOver : ""
        } ${isDarkMode ? styles.darkDropArea : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <p style={{ color: isDarkMode ? "white" : "black" }}>
          Drag & Drop a file here or{" "}
          <span className={styles.uploadText}>click to upload</span>
        </p>
        <input
          type="file"
          className={styles.fileInput}
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
      </div>

      {filePreview && selectedFile && (
        <div className={styles.previewContainer}>
          <h3>File Preview:</h3>
          {selectedFile.type.startsWith("image/") ? (
            <img
              src={filePreview}
              alt="Preview"
              className={styles.imagePreview}
            />
          ) : (
            <embed
              src={filePreview}
              type="application/pdf"
              className={styles.pdfViewer}
            />
          )}
        </div>
      )}

      <button onClick={handleFileUpload} className={styles.uploadButton}>
        Upload and Extract Text
      </button>

      {loading && <div className={styles.loader}>Loading...</div>}
      {error && <p className={styles.errorText}>{error}</p>}
      {successMessage && <p className={styles.successText}>{successMessage}</p>}

      {extractedText && (
        <div>
          <h2>Extracted Text:</h2>
          <div className={styles.extractedTextBox}>
            <pre className={styles.preformattedText}>{extractedText}</pre>
          </div>
        </div>
      )}

      {skeleton && (
        <div>
          <h2 style={{ color: isDarkMode ? "white" : "black" }}>
            Generated Mind Map:
          </h2>
          <div className={styles.mindMapContainer}>
            <MindMap
              skeleton={skeleton}
              setSkeleton={setSkeleton}
              extractedText={extractedText}
              description={description}
              isDarkMode={isDarkMode}
            />
          </div>
          <div className={styles.descriptionContainer}>
            <input
              type="text"
              placeholder="Enter description for mind map"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${styles.descriptionInput} ${
                isDarkMode ? styles.darkInput : ""
              }`}
            />
          </div>
          <button className={styles.uploadButton}>Save Mind Map</button>
        </div>
      )}
    </div>
  );
}
export default Sample;
