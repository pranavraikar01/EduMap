import React, { useState, useEffect } from "react";
import MindMapModal from "./MindMapModal"; // Import the modal component
import styles from "./MyMindMaps.module.css"; // Custom CSS for the page
import Navbar from "./Navbar";

function MyMindMaps() {
  const [mindmaps, setMindmaps] = useState([]);
  const [selectedMindmap, setSelectedMindmap] = useState(null);

  useEffect(() => {
    // Fetch mind maps on component mount
    const fetchMindMaps = async () => {
      try {
        const response = await fetch(
          "http://localhost:3000/api/v1/mindmaps/my-mindmaps",
          {
            method: "GET",
            headers: {
              "x-access-token": localStorage.getItem("token"), // Authentication token
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          setMindmaps(result.data.mindmaps);
        } else {
          console.error("Failed to fetch mind maps");
        }
      } catch (error) {
        console.error("Error fetching mind maps:", error);
      }
    };

    fetchMindMaps();
  }, []);

  return (
    <div className={styles.container}>
      <Navbar/>
      <h1>My Mind Maps</h1>
      <div className={styles.cardContainer}>
        {mindmaps.map((mindmap) => (
          <div key={mindmap._id} className={styles.card}>
            <h2>{mindmap.description}</h2>
            <p>Date: {new Date(mindmap.date).toLocaleDateString()}</p>
            <button onClick={() => setSelectedMindmap(mindmap)}>Open</button>
          </div>
        ))}
      </div>

      {selectedMindmap && (
        <MindMapModal
          mindmap={selectedMindmap}
          onClose={() => setSelectedMindmap(null)}
        />
      )}
    </div>
  );
}

export default MyMindMaps;
