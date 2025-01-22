import { useState } from "react";
import { Handle, Position } from "@xyflow/react";

const EditableNode = ({ id, data, isConnectable }) => {
  const [label, setLabel] = useState(data.label);
  const [isEditing, setIsEditing] = useState(false);

  const handleLabelChange = (e) => {
    setLabel(e.target.value);
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleFetchDescription = () => {
    if (data.onFetchDescription) {
      data.onFetchDescription(id, label); // Call the passed function with id and label
    } else {
      console.error("No onFetchDescription function provided!");
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: 10,
        borderRadius: 5,
        position: "relative",
      }}
    >
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={handleLabelChange}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <span onClick={handleEditClick}>{label}</span>
      )}
      <button
        style={{
          position: "absolute",
          top: -10,
          right: -10,
          backgroundColor: "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "5px",
          padding: "5px",
          cursor: "pointer",
        }}
        onClick={handleFetchDescription} // Call the fetch function on click
      >
        Info
      </button>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default EditableNode;
