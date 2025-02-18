import { useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from "@xyflow/react";
import "reactflow/dist/style.css";
import { GoogleGenerativeAI } from "@google/generative-ai";
import EditableNode from "./EditableNode";
import { TailSpin } from "react-loader-spinner"; // Import the loader

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const initialNodes = [
  {
    id: "1",
    data: { label: "Root Node" },
    position: { x: 500, y: 500 },
    style: {
      background: "#ff6f61",
      color: "white",
      borderRadius: 10,
      padding: 10,
    },
  },
];

const initialEdges = [];

function computeLayout(nodes, parentPosition, depth = 0) {
  const baseRadius = 650;
  const radius = Math.max(100, baseRadius * Math.exp(-0.6 * depth));
  const angleBetweenNodes = (2 * Math.PI) / nodes.length;
  let layoutNodes = [];

  nodes.forEach((node, index) => {
    const angle = angleBetweenNodes * index;
    const x = parentPosition.x + radius * Math.cos(angle);
    const y = parentPosition.y + radius * Math.sin(angle);

    layoutNodes.push({
      ...node,
      position: { x, y },
      depth,
      style: {
        background: "#feb236",
        color: "white",
        borderRadius: 10,
        padding: 10,
      },
    });
  });

  return layoutNodes;
}

const Modal = ({ visible, content, onClose }) => {
  if (!visible) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <h3>Node Description</h3>
        <div style={modalStyles.content}>
          <p>{content}</p>
        </div>
        <button onClick={onClose} style={modalStyles.closeButton}>
          Close
        </button>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "400px",
    maxHeight: "80vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
  },
  content: {
    overflowY: "auto",
    maxHeight: "60vh",
    marginBottom: "10px",
  },
  closeButton: {
    padding: "8px 16px",
    backgroundColor: "#007BFF",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    alignSelf: "center",
  },
};

export default function MindMap({ skeleton, extractedText, description }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Loader state

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const fetchNodeDescription = async (id, label) => {
    setIsLoading(true); // Set loader state to true
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Based on the data given in:\n ${extractedText}, generate a description for ${label} based on your self knowledge base. If the given data is empty, then generate a description for ${label} based on ${description}.`;
      const result = await model.generateContent([prompt]);
      const response = await result.response;
      const content =
        response.candidates[0].content.parts[0].text ||
        "No description available.";
      setModalContent(`Description for "${label}":\n${content}`);
      setModalVisible(true);
    } catch (error) {
      console.error("Error fetching description:", error);
      setModalContent("An error occurred while fetching the description.");
      setModalVisible(true);
    } finally {
      setIsLoading(false); // Set loader state to false after request is done
    }
  };

  const onNodeClick = useCallback(
    (event, node) => {
      const isExpanded = expandedNodes.has(node.id);
      let newNodes = [];
      let newEdges = [];

      if (isExpanded) {
        setNodes((nds) =>
          nds.filter((n) => !skeleton[node.id]?.some((c) => c.id === n.id))
        );
        setEdges((eds) =>
          eds.filter((e) => !skeleton[node.id]?.some((c) => e.target === c.id))
        );
        setExpandedNodes(
          (prev) => new Set([...prev].filter((id) => id !== node.id))
        );
      } else {
        if (skeleton[node.id]) {
          const parentDepth = node.depth ?? 0;
          newNodes = computeLayout(
            skeleton[node.id].map((child) => ({
              ...child,
              depth: parentDepth + 1,
            })),
            node.position,
            parentDepth + 1
          );

          newEdges = newNodes.map((childNode) => ({
            id: `e${node.id}-${childNode.id}`,
            source: node.id,
            target: childNode.id,
            animated: true,
          }));

          setExpandedNodes((prev) => new Set([...prev, node.id]));
        }
        setNodes((nds) => [...nds, ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
      }
    },
    [expandedNodes, nodes, edges, setNodes, setEdges, skeleton]
  );

  // Handle dragging of nodes and update child positions
  const onNodeDragStop = (event, node) => {
    const updatedNodes = nodes.map((n) =>
      n.id === node.id
        ? { ...n, position: { x: node.position.x, y: node.position.y } }
        : n
    );

    if (skeleton[node.id]) {
      const parentPosition = node.position;
      const updatedChildren = skeleton[node.id].map((child) => {
        const childNode = nodes.find((n) => n.id === child.id);
        const parentDepth = node.depth ?? 0;
        const radius = Math.max(150, 100 + Math.exp(-0.6 * parentDepth) * 150);
        const angleBetweenNodes = (2 * Math.PI) / skeleton[node.id].length;
        const angle = angleBetweenNodes * skeleton[node.id].indexOf(child);
        const x = parentPosition.x + radius * Math.cos(angle);
        const y = parentPosition.y + radius * Math.sin(angle);

        return { ...childNode, position: { x, y } };
      });

      updatedNodes.push(...updatedChildren);
    }

    setNodes(updatedNodes); // Set the updated nodes
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#f5f5f5" }}>
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          type: "editableNode",
          data: {
            ...node.data,
            onFetchDescription: () =>
              fetchNodeDescription(node.id, node.data.label),
          },
        }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={{ editableNode: EditableNode }}
        fitView
      >
        <MiniMap nodeColor={() => "blue"} />
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {/* Loader Component - Visible when isLoading is true */}
      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 1000,
          }}
        >
          <TailSpin color="#007BFF" height={80} width={80} />
        </div>
      )}

      <Modal
        visible={modalVisible}
        content={modalContent}
        onClose={() => setModalVisible(false)}
      />
    </div>
  );
}
