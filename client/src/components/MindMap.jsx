// // MindMap.js
// import { useCallback, useState } from "react";
// import {
//   ReactFlow,
//   MiniMap,
//   Controls,
//   Background,
//   useNodesState,
//   useEdgesState,
//   addEdge,
// } from "@xyflow/react";
// import EditableNode from "./EditableNode";

// const initialNodes = [
//   {
//     id: "1",
//     position: { x: 0, y: 0 },
//     data: { label: "Plant Kingdom" },
//     type: "editableNode",
//   },
// ];

// const initialEdges = [];

// const childNodes = {
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
// };

// function computeLayout(nodes, parentPosition) {
//   const xSpacing = 200;
//   const ySpacing = 150;

//   let layoutNodes = [];
//   let currentY = parentPosition.y + ySpacing;

//   nodes.forEach((node, index) => {
//     const x = parentPosition.x + (index - (nodes.length - 1) / 2) * xSpacing;
//     layoutNodes.push({
//       ...node,
//       position: { x, y: currentY },
//     });
//   });

//   return layoutNodes;
// }

// export default function MindMap() {
//   const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
//   const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
//   const [expandedNodes, setExpandedNodes] = useState(new Set());

//   const onConnect = useCallback(
//     (params) => setEdges((eds) => addEdge(params, eds)),
//     [setEdges]
//   );

//   const onNodeClick = useCallback(
//     (event, node) => {
//       const isExpanded = expandedNodes.has(node.id);
//       let newNodes = [];
//       let newEdges = [];

//       if (isExpanded) {
//         const nodesToRemove = new Set();
//         const edgesToRemove = new Set();

//         nodes.forEach((n) => {
//           if (
//             childNodes[node.id] &&
//             childNodes[node.id].some((c) => c.id === n.id)
//           ) {
//             nodesToRemove.add(n.id);
//           }
//         });

//         edges.forEach((e) => {
//           if (
//             childNodes[node.id] &&
//             childNodes[node.id].some((c) => e.target === c.id)
//           ) {
//             edgesToRemove.add(e.id);
//           }
//         });

//         setNodes((nds) => nds.filter((n) => !nodesToRemove.has(n.id)));
//         setEdges((eds) => eds.filter((e) => !edgesToRemove.has(e.id)));
//         setExpandedNodes(
//           (prev) => new Set([...prev].filter((id) => id !== node.id))
//         );
//       } else {
//         if (childNodes[node.id]) {
//           newNodes = computeLayout(childNodes[node.id], node.position);
//           newEdges = newNodes.map((childNode) => ({
//             id: `e${node.id}-${childNode.id}`,
//             source: node.id,
//             target: childNode.id,
//           }));
//           setExpandedNodes((prev) => new Set([...prev, node.id]));
//         }
//         setNodes((nds) => [...nds, ...newNodes]);
//         setEdges((eds) => [...eds, ...newEdges]);
//       }
//     },
//     [expandedNodes, nodes, edges, setNodes, setEdges]
//   );

//   return (
//     <ReactFlow
//       nodes={nodes}
//       edges={edges}
//       onNodesChange={onNodesChange}
//       onEdgesChange={onEdgesChange}
//       onConnect={onConnect}
//       onNodeClick={onNodeClick}
//       nodeTypes={{ editableNode: EditableNode }} // Register the custom node type
//     >
//       <Controls />
//       <MiniMap />
//       <Background variant="dots" gap={12} size={1} />
//     </ReactFlow>
//   );
// }
import { useCallback, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from "@xyflow/react";
import EditableNode from "./EditableNode";

const initialNodes = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Root Node" }, // Root node of the skeleton
    type: "editableNode",
  },
];

const initialEdges = [];

function computeLayout(nodes, parentPosition) {
  const xSpacing = 200;
  const ySpacing = 150;

  let layoutNodes = [];
  let currentY = parentPosition.y + ySpacing;

  nodes.forEach((node, index) => {
    const x = parentPosition.x + (index - (nodes.length - 1) / 2) * xSpacing;
    layoutNodes.push({
      ...node,
      position: { x, y: currentY },
    });
  });

  return layoutNodes;
}

export default function MindMap({ skeleton }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (event, node) => {
      const isExpanded = expandedNodes.has(node.id);
      let newNodes = [];
      let newEdges = [];

      if (isExpanded) {
        const nodesToRemove = new Set();
        const edgesToRemove = new Set();

        nodes.forEach((n) => {
          if (
            skeleton[node.id] &&
            skeleton[node.id].some((c) => c.id === n.id)
          ) {
            nodesToRemove.add(n.id);
          }
        });

        edges.forEach((e) => {
          if (
            skeleton[node.id] &&
            skeleton[node.id].some((c) => e.target === c.id)
          ) {
            edgesToRemove.add(e.id);
          }
        });

        setNodes((nds) => nds.filter((n) => !nodesToRemove.has(n.id)));
        setEdges((eds) => eds.filter((e) => !edgesToRemove.has(e.id)));
        setExpandedNodes(
          (prev) => new Set([...prev].filter((id) => id !== node.id))
        );
      } else {
        if (skeleton[node.id]) {
          newNodes = computeLayout(skeleton[node.id], node.position);
          newEdges = newNodes.map((childNode) => ({
            id: `e${node.id}-${childNode.id}`,
            source: node.id,
            target: childNode.id,
          }));
          setExpandedNodes((prev) => new Set([...prev, node.id]));
        }
        setNodes((nds) => [...nds, ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
      }
    },
    [expandedNodes, nodes, edges, setNodes, setEdges, skeleton],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      nodeTypes={{ editableNode: EditableNode }}
    >
      <Controls />
      <MiniMap />
      <Background variant="dots" gap={12} size={1} />
    </ReactFlow>
  );
}
