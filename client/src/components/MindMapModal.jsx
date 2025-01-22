import React from "react";
import styles from "./MindMapModal.module.css"; // Import custom CSS
import MindMap from "./MindMap";

function MindMapModal({ mindmap, onClose }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>
          Close
        </button>

        <div className={styles.content}>
          <h2>{mindmap.description}</h2>
          <p>Date Created: {new Date(mindmap.date).toLocaleDateString()}</p>

          {/* For now, keeping the modal content blank */}
          <div style={{ width: "100vw", height: "100vh" }}>
            <MindMap
              skeleton={mindmap.mindmapObject}
              description={mindmap.description}
            />{" "}
            {/* Pass skeleton to MindMap */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MindMapModal;
