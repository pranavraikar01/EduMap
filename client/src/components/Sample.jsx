// // // import React, { useState } from "react";

// // // function Sample() {
// // //   const [selectedFile, setSelectedFile] = useState(null);
// // //   const [extractedText, setExtractedText] = useState("");
// // //   const [error, setError] = useState("");

// // //   // Function to handle file change
// // //   const handleFileChange = (event) => {
// // //     setSelectedFile(event.target.files[0]);
// // //   };

// // //   // Function to handle API call
// // //   const handleFileUpload = async () => {
// // //     if (!selectedFile) {
// // //       setError("Please select a file");
// // //       return;
// // //     }

// // //     const formData = new FormData();
// // //     formData.append("file", selectedFile);

// // //     try {
// // //       const response = await fetch("http://localhost:5000/extract-text", {
// // //         method: "POST",
// // //         body: formData,
// // //       });

// // //       if (response.ok) {
// // //         const data = await response.json();
// // //         setExtractedText(data.text); // Store extracted text in state
// // //         console.log(data);
// // //         setError("");
// // //       } else {
// // //         setError("Error in extracting text");
// // //       }
// // //     } catch (error) {
// // //       console.error("API error:", error);
// // //       setError("An error occurred");
// // //     }
// // //   };

// // //   return (
// // //     <div>
// // //       <h1>PDF Text Extractor</h1>

// // //       <input type="file" onChange={handleFileChange} />
// // //       <button onClick={handleFileUpload}>Upload and Extract Text</button>

// // //       {error && <p style={{ color: "red" }}>{error}</p>}

// // //       {extractedText && (
// // //         <div>
// // //           <h2>Extracted Text:</h2>
// // //           <pre>{extractedText}</pre> {/* Preformatted text */}
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // }

// // // export default Sample;
// // import React, { useState } from "react";

// // function Sample() {
// //   const [selectedFile, setSelectedFile] = useState(null);
// //   const [extractedText, setExtractedText] = useState("");
// //   const [error, setError] = useState("");
// //   const [skeleton, setSkeleton] = useState(null); // To store the generated skeleton

// //   // Function to handle file change
// //   const handleFileChange = (event) => {
// //     setSelectedFile(event.target.files[0]);
// //   };

// //   // Function to handle API call for PDF text extraction
// //   const handleFileUpload = async () => {
// //     if (!selectedFile) {
// //       setError("Please select a file");
// //       return;
// //     }

// //     const formData = new FormData();
// //     formData.append("file", selectedFile);

// //     try {
// //       const response = await fetch("http://localhost:5000/extract-text", {
// //         method: "POST",
// //         body: formData,
// //       });

// //       if (response.ok) {
// //         const data = await response.json();
// //         setExtractedText(data.text); // Store extracted text in state
// //         console.log(data);
// //         setError("");

// //         // Send the extracted text to OpenAI to generate the mind map skeleton
// //         await handleOpenAICall(data.text);
// //       } else {
// //         setError("Error in extracting text");
// //       }
// //     } catch (error) {
// //       console.error("API error:", error);
// //       setError("An error occurred");
// //     }
// //   };

// //   // Function to handle OpenAI API call to get the mind map skeleton
// //   const handleOpenAICall = async (extractedText) => {
// //     try {
// //       const response = await fetch(
// //         "https://api.openai.com/v1/chat/completions",
// //         {
// //           method: "POST",
// //           headers: {
// //             "Content-Type": "application/json",
// //
// //           },
// //           body: JSON.stringify({
// //             model: "gpt-3.5-turbo",
// //             prompt: `Generate a mind map skeleton based on the following text: ${extractedText}`,
// //             max_tokens: 500,
// //           }),
// //         }
// //       );

// //       if (response.ok) {
// //         const data = await response.json();
// //         setSkeleton(data.choices[0].text); // Store the skeleton received from OpenAI
// //         console.log("Skeleton:", data.choices[0].text);
// //       } else {
// //         setError("Error in generating mind map skeleton");
// //       }
// //     } catch (error) {
// //       console.error("OpenAI API error:", error);
// //       setError("An error occurred while generating the skeleton");
// //     }
// //   };

// //   return (
// //     <div>
// //       <h1>PDF Text Extractor & Mind Map Generator</h1>

// //       <input type="file" onChange={handleFileChange} />
// //       <button onClick={handleFileUpload}>Upload and Extract Text</button>

// //       {error && <p style={{ color: "red" }}>{error}</p>}

// //       {extractedText && (
// //         <div>
// //           <h2>Extracted Text:</h2>
// //           <pre>{extractedText}</pre> {/* Preformatted text */}
// //         </div>
// //       )}

// //       {skeleton && (
// //         <div>
// //           <h2>Generated Mind Map Skeleton:</h2>
// //           <pre>{skeleton}</pre> {/* Preformatted mind map skeleton */}
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default Sample;
// import React, { useState } from "react";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(API_KEY);

// function Sample() {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [extractedText, setExtractedText] = useState("");
//   const [error, setError] = useState("");
//   const [skeleton, setSkeleton] = useState(null); // To store the generated skeleton

//   // Function to handle file change
//   const handleFileChange = (event) => {
//     setSelectedFile(event.target.files[0]);
//   };

//   // Function to handle API call for PDF text extraction
//   const handleFileUpload = async () => {
//     if (!selectedFile) {
//       setError("Please select a file");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("file", selectedFile);

//     try {
//       const response = await fetch("http://localhost:5000/extract-text", {
//         method: "POST",
//         body: formData,
//       });

//       if (response.ok) {
//         const data = await response.json();
//         setExtractedText(data.text); // Store extracted text in state
//         console.log(data);
//         setError("");

//         // Send the extracted text to Gemini API to generate the mind map skeleton
//         await handleOpenAICall(data.text);
//       } else {
//         setError("Error in extracting text");
//       }
//     } catch (error) {
//       console.error("API error:", error);
//       setError("An error occurred");
//     }
//   };

//   // Function to handle Gemini API call to get the mind map skeleton
//   const handleOpenAICall = async (extractedText) => {
//     try {
//       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Update the model name here
//       const prompt = `Based on the data given in :\n ${extractedText}, generate a structured mind map skeleton.
//       The heirarchy must resemble to following structure: example childNodes = {
//   1: [
//     { id: "2", data: { label: "Thallophyta" }, type: "editableNode" },
//     { id: "3", data: { label: "Bryophyta" }, type: "editableNode" },
//     { id: "4", data: { label: "Pteridophyta" }, type: "editableNode" },
//     { id: "5", data: { label: "Gymnosperms" }, type: "editableNode" },
//     { id: "6", data: { label: "Angiosperms" }, type: "editableNode" },
//   ],
//   2: [
//     { id: "7", data: { label: "Algae" }, type: "editableNode" },
//     { id: "8", data: { label: "Fungi" }, type: "editableNode" },
//   ],
//   3: [
//     { id: "9", data: { label: "Mosses" }, type: "editableNode" },
//     { id: "10", data: { label: "Liverworts" }, type: "editableNode" },
//   ],
//   4: [
//     { id: "11", data: { label: "Ferns" }, type: "editableNode" },
//     { id: "12", data: { label: "Horsetails" }, type: "editableNode" },
//   ],
//   5: [
//     { id: "13", data: { label: "Cycads" }, type: "editableNode" },
//     { id: "14", data: { label: "Conifers" }, type: "editableNode" },
//     { id: "15", data: { label: "Gnetophytes" }, type: "editableNode" },
//   ],
//   6: [
//     { id: "16", data: { label: "Monocots" }, type: "editableNode" },
//     { id: "17", data: { label: "Dicots" }, type: "editableNode" },
//   ],
// }.
// since it needs to map on a UI for mindmap generation Give the complete object and dont give any extra stuff just give the skeleton.
//       `;

//       const result = await model.generateContent([prompt]);
//       const response = await result.response;
//       const text = await response.text();
//       setSkeleton(text); // Store the skeleton received from Gemini
//       console.log("Skeleton:", text);
//     } catch (error) {
//       console.error("Gemini API error:", error);
//       setError("An error occurred while generating the skeleton");
//     }
//   };

//   return (
//     <div>
//       <h1>PDF Text Extractor & Mind Map Generator</h1>

//       <input type="file" onChange={handleFileChange} />
//       <button onClick={handleFileUpload}>Upload and Extract Text</button>

//       {error && <p style={{ color: "red" }}>{error}</p>}

//       {extractedText && (
//         <div>
//           <h2>Extracted Text:</h2>
//           <pre>{extractedText}</pre> {/* Preformatted text */}
//         </div>
//       )}

//       {skeleton && (
//         <div>
//           <h2>Generated Mind Map Skeleton:</h2>
//           <pre>{skeleton}</pre> {/* Preformatted mind map skeleton */}
//         </div>
//       )}
//     </div>
//   );
// }

// export default Sample;
import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MindMap from "./MindMap"; // Import the MindMap component

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log(API_KEY); // Logs your API key from the .env file

// Replace with your API key
const genAI = new GoogleGenerativeAI(API_KEY);

function Sample() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState("");
  const [skeleton, setSkeleton] = useState(null); // To store the generated skeleton
  const [description, setDescription] = useState(""); // For the mind map description
  const [successMessage, setSuccessMessage] = useState(""); // For showing success or error messages

  // Function to handle file change
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // Function to handle API call for PDF text extraction
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://localhost:5000/extract-text", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedText(data.text); // Store extracted text in state
        console.log(data);
        setError("");

        // Send the extracted text to Gemini API to generate the mind map skeleton
        await handleOpenAICall(data.text);
      } else {
        setError("Error in extracting text");
      }
    } catch (error) {
      console.error("API error:", error);
      setError("An error occurred");
    }
  };

  // Function to handle Gemini API call to get the mind map skeleton
  const handleOpenAICall = async (extractedText) => {
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
    }
  };

  // Function to handle saving the mind map via our API
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
            "x-access-token": localStorage.getItem("token"), // Replace with the user's JWT token
          },
          body: JSON.stringify({
            // user: "USER_ID", // Replace with the actual user ID
            date: new Date().toISOString(), // Automatically set the current date
            mindmapObject: skeleton, // Send the generated skeleton
            description: description, // Send the user-provided description
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
      <h1>PDF Text Extractor & Mind Map Generator</h1>

      <input type="file" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>Upload and Extract Text</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      {extractedText && (
        <div>
          <h2>Extracted Text:</h2>
          <div style={styles.extractedTextBox}>
            <pre style={styles.preformattedText}>{extractedText}</pre>{" "}
            {/* Preformatted text */}
          </div>
        </div>
      )}

      {skeleton && (
        <div>
          <h2>Generated Mind Map:</h2>
          <div style={{ width: "100vw", height: "100vh" }}>
            <MindMap skeleton={skeleton} /> {/* Pass skeleton to MindMap */}
          </div>

          {/* Input for description */}
          <div style={styles.descriptionContainer}>
            <input
              type="text"
              placeholder="Enter description for mind map"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.descriptionInput}
            />
          </div>

          {/* Button to save mind map */}
          <button onClick={saveMindMap}>Save Mind Map</button>
        </div>
      )}
    </div>
  );
}

// Define the styles object for the extracted text box and other elements
const styles = {
  container: {
    textAlign: "center", // Center the whole container
    padding: "20px",
  },
  extractedTextBox: {
    display: "inline-block", // Center horizontally
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
    marginTop: "10px",
    maxHeight: "400px",
    maxWidth: "700px", // Optional: Limit the width of the box
    overflowY: "auto",
    textAlign: "center", // Center the text inside
  },
  preformattedText: {
    textAlign: "center", // Center the text inside <pre> element
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
