// EditableNode.js
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

  return (
    <div style={{ border: "1px solid #ddd", padding: 10, borderRadius: 5 }}>
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
