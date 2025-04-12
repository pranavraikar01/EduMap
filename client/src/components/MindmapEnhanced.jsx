import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const Mindmap = ({ skeleton, extractedText, description }) => {
  const svgRef = useRef();
  const canvasContainerRef = useRef();
  const [data, setData] = useState({ nodes: [], links: [] });
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [subMindMapParentNode, setSubMindMapParentNode] = useState("");
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [toolbarState, setToolbarState] = useState({
    activeColor: "#1e90ff",
    textSize: "18px",
    nodeSize: 15,
    lineThickness: 2,
    backgroundColor: "#f0f0f0",
    isGridVisible: false,
    gridSize: 20,
    zoom: 1,
  });
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [activeSnapLines, setActiveSnapLines] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!skeleton) return;

    const nodes = new Map();
    const links = [];

    nodes.set("root", {
      id: "root",
      label: "Root",
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      color: "#ff5733",
      textSize: toolbarState.textSize,
      nodeSize: toolbarState.nodeSize,
    });

    Object.entries(skeleton).forEach(([parentId, children]) => {
      if (!nodes.has(parentId)) {
        nodes.set(parentId, {
          id: parentId,
          label: `Node ${parentId}`,
          x: Math.random() * canvasSize.width,
          y: Math.random() * canvasSize.height,
          color: toolbarState.activeColor,
          textSize: toolbarState.textSize,
          nodeSize: toolbarState.nodeSize,
        });
      }

      children.forEach((child) => {
        if (!child || !child.id || !child.data) return;
        if (!nodes.has(child.id)) {
          nodes.set(child.id, {
            id: child.id,
            label: child.data.label || "Unnamed Node",
            x: Math.random() * canvasSize.width,
            y: Math.random() * canvasSize.height,
            color: toolbarState.activeColor,
            textSize: toolbarState.textSize,
            nodeSize: toolbarState.nodeSize,
          });
        }
        links.push({
          source: parentId,
          target: child.id,
          thickness: toolbarState.lineThickness,
          color: "#555",
        });
      });
    });

    // Save current state for undo
    saveToUndoStack();

    setData({ nodes: Array.from(nodes.values()), links });
  }, [skeleton, canvasSize]);

  const saveToUndoStack = () => {
    setUndoStack((prev) => [...prev, JSON.stringify(data)]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack((prev) => [...prev, JSON.stringify(data)]);
      setUndoStack((prev) => prev.slice(0, -1));
      setData(JSON.parse(previousState));
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack((prev) => [...prev, JSON.stringify(data)]);
      setRedoStack((prev) => prev.slice(0, -1));
      setData(JSON.parse(nextState));
    }
  };

  useEffect(() => {
    if (!data.nodes.length) return;

    const svg = d3
      .select(svgRef.current)
      .attr("width", canvasSize.width)
      .attr("height", canvasSize.height)
      .style("background", toolbarState.backgroundColor);

    svg.selectAll("*").remove(); // Clear previous drawings
    const g = svg.append("g"); // Group for zooming & panning

    // Draw grid if enabled
    if (toolbarState.isGridVisible) {
      const grid = g.append("g").attr("class", "grid");

      // Draw vertical grid lines
      for (let x = 0; x < canvasSize.width; x += toolbarState.gridSize) {
        grid
          .append("line")
          .attr("x1", x)
          .attr("y1", 0)
          .attr("x2", x)
          .attr("y2", canvasSize.height)
          .attr("stroke", "#ddd")
          .attr("stroke-width", 0.5);
      }

      // Draw horizontal grid lines
      for (let y = 0; y < canvasSize.height; y += toolbarState.gridSize) {
        grid
          .append("line")
          .attr("x1", 0)
          .attr("y1", y)
          .attr("x2", canvasSize.width)
          .attr("y2", y)
          .attr("stroke", "#ddd")
          .attr("stroke-width", 0.5);
      }
    }

    // Draw snap lines
    const snapLines = g.append("g").attr("class", "snap-lines");
    activeSnapLines.forEach((line) => {
      snapLines
        .append("line")
        .attr("x1", line.x1)
        .attr("y1", line.y1)
        .attr("x2", line.x2)
        .attr("y2", line.y2)
        .attr("stroke", "#ff0000")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5");
    });

    // Draw selection rectangle if selecting
    if (selectionRect) {
      g.append("rect")
        .attr("x", selectionRect.x)
        .attr("y", selectionRect.y)
        .attr("width", selectionRect.width)
        .attr("height", selectionRect.height)
        .attr("fill", "rgba(0, 123, 255, 0.1)")
        .attr("stroke", "rgba(0, 123, 255, 0.8)")
        .attr("stroke-width", 1);
    }

    const simulation = d3
      .forceSimulation(data.nodes)
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force(
        "center",
        d3.forceCenter(canvasSize.width / 2, canvasSize.height / 2)
      );

    const link = g
      .append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", (d) => d.color || "#555")
      .attr("stroke-width", (d) => d.thickness || toolbarState.lineThickness);

    const node = g
      .append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(
        d3.drag().on("start", dragStart).on("drag", dragged).on("end", dragEnd)
      )
      .on("click", (event, d) => {
        if (!event.ctrlKey && !event.metaKey) {
          setSelectedNodes([d.id]);
        } else {
          setSelectedNodes((prevSelected) => {
            if (prevSelected.includes(d.id)) {
              return prevSelected.filter((id) => id !== d.id);
            } else {
              return [...prevSelected, d.id];
            }
          });
        }
        event.stopPropagation();
      });

    node
      .append("circle")
      .attr("r", (d) => d.nodeSize || toolbarState.nodeSize)
      .attr("fill", (d) => {
        if (selectedNodes.includes(d.id)) {
          return "#f8e71c"; // Highlight color for selected nodes
        }
        return d.id === "root"
          ? "#ff5733"
          : d.color || toolbarState.activeColor;
      })
      .attr("stroke", (d) => (selectedNodes.includes(d.id) ? "#000" : "none"))
      .attr("stroke-width", 2);

    const text = node
      .append("text")
      .text((d) => d.label)
      .attr("x", 20)
      .attr("y", 5)
      .style("font-size", (d) => d.textSize || toolbarState.textSize)
      .style("font-weight", "bold")
      .style("cursor", "pointer")
      .on("dblclick", editNodeText);

    node.each(function (d) {
      const textElement = d3.select(this).select("text");
      const textWidth = textElement.node().getBBox().width;

      // "ⓘ" Button (Info)
      d3.select(this)
        .append("text")
        .attr("x", 25 + textWidth)
        .attr("y", 5)
        .attr("font-size", "16px")
        .attr("fill", "blue")
        .attr("cursor", "pointer")
        .text("ⓘ")
        .on("click", async (event) => {
          event.stopPropagation();
          await fetchNodeDescription(d);
        });

      // "➕" Button (Expand)
      d3.select(this)
        .append("text")
        .attr("x", 45 + textWidth) // Positioned after "ⓘ"
        .attr("y", 5)
        .attr("font-size", "16px")
        .attr("fill", "green")
        .attr("cursor", "pointer")
        .text("➕")
        .on("click", async (event) => {
          event.stopPropagation();
          await expandNode(d);
        });
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    // Clear selection when clicking on empty space
    svg.on("click", () => {
      setSelectedNodes([]);
    });

    // Selection rectangle functionality
    svg.on("mousedown", (event) => {
      if (isSelecting && !event.target.closest("g")) {
        const [x, y] = d3.pointer(event);
        setSelectionStart({ x, y });
        setSelectionRect({ x, y, width: 0, height: 0 });
        event.preventDefault();
      }
    });

    svg.on("mousemove", (event) => {
      if (isSelecting && selectionRect) {
        const [x, y] = d3.pointer(event);
        const newRect = {
          x: Math.min(x, selectionStart.x),
          y: Math.min(y, selectionStart.y),
          width: Math.abs(x - selectionStart.x),
          height: Math.abs(y - selectionStart.y),
        };
        setSelectionRect(newRect);
      }
    });

    svg.on("mouseup", (event) => {
      if (isSelecting && selectionRect) {
        // Find nodes within selection rectangle
        const selectedIds = data.nodes
          .filter(
            (node) =>
              node.x >= selectionRect.x &&
              node.x <= selectionRect.x + selectionRect.width &&
              node.y >= selectionRect.y &&
              node.y <= selectionRect.y + selectionRect.height
          )
          .map((node) => node.id);

        setSelectedNodes(selectedIds);
        setSelectionRect(null);
      }
    });

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setToolbarState((prev) => ({ ...prev, zoom: event.transform.k }));
      });

    if (isPanning) {
      svg.call(zoom);
    } else {
      svg.on(".zoom", null);
    }

    function dragStart(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;

      // If node is not in selected nodes, make it the only selected node
      if (!selectedNodes.includes(d.id)) {
        setSelectedNodes([d.id]);
      }
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;

      // Check for snap to grid
      if (toolbarState.isGridVisible) {
        const gridSize = toolbarState.gridSize;
        const snapX = Math.round(event.x / gridSize) * gridSize;
        const snapY = Math.round(event.y / gridSize) * gridSize;

        // Only snap if close enough to grid line
        if (Math.abs(event.x - snapX) < 10) d.fx = snapX;
        if (Math.abs(event.y - snapY) < 10) d.fy = snapY;

        // Create snap lines
        const newSnapLines = [];
        if (Math.abs(event.x - snapX) < 10) {
          newSnapLines.push({
            x1: snapX,
            y1: 0,
            x2: snapX,
            y2: canvasSize.height,
          });
        }
        if (Math.abs(event.y - snapY) < 10) {
          newSnapLines.push({
            x1: 0,
            y1: snapY,
            x2: canvasSize.width,
            y2: snapY,
          });
        }
        setActiveSnapLines(newSnapLines);
      }

      // Move all selected nodes together
      if (selectedNodes.length > 1) {
        const dx = event.x - d.x;
        const dy = event.y - d.y;

        setData((prevData) => {
          const updatedNodes = prevData.nodes.map((node) => {
            if (selectedNodes.includes(node.id) && node.id !== d.id) {
              return {
                ...node,
                x: node.x + dx,
                y: node.y + dy,
                fx: node.x + dx,
                fy: node.y + dy,
              };
            }
            return node;
          });

          return { ...prevData, nodes: updatedNodes };
        });
      }
    }

    function dragEnd(event, d) {
      if (!event.active) simulation.alphaTarget(0);

      // Release fixed position if not selected
      if (!selectedNodes.includes(d.id)) {
        d.fx = null;
        d.fy = null;
      }

      setActiveSnapLines([]);
      saveToUndoStack();
    }

    function editNodeText(event, d) {
      event.stopPropagation();
      const newText = prompt("Edit node label:", d.label);
      if (newText) {
        d.label = newText;
        setData((prev) => {
          const updatedNodes = prev.nodes.map((node) =>
            node.id === d.id ? { ...node, label: newText } : node
          );

          saveToUndoStack();
          return { ...prev, nodes: updatedNodes };
        });
      }
    }
  }, [
    data,
    canvasSize,
    selectedNodes,
    toolbarState,
    isSelecting,
    selectionRect,
    isPanning,
    activeSnapLines,
  ]);

  async function expandNode(label) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Based on the data given in:\n ${extractedText}, generate a JSON structured sub-mind map for ${label.label}. The hierarchy must resemble the following structure:  
      { "1": [{ "id": "2", "data": { "label": "Example" }, "type": "editableNode" }] }  
      Return only valid JSON.`;
      console.log("Event", label.label);

      const result = await model.generateContent([prompt]);
      const response = await result.response;
      let content = response.candidates[0].content.parts[0].text;

      // Clean up JSON formatting
      content = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const newSubMindMap = JSON.parse(content);
      console.log("New submindmap", newSubMindMap);

      // Save current state for undo
      saveToUndoStack();

      setData((prevData) => {
        const updatedNodes = [...prevData.nodes];
        const updatedLinks = [...prevData.links];

        function processHierarchy(parentNode, hierarchy) {
          Object.entries(hierarchy).forEach(([parentId, children]) => {
            children.forEach((child) => {
              if (!child || !child.id || !child.data) return;

              // Create new node
              const newNode = {
                id: child.id,
                label: child.data.label,
                x: parentNode.x + Math.random() * 150 - 75,
                y: parentNode.y + Math.random() * 150 - 75,
                color: toolbarState.activeColor,
                textSize: toolbarState.textSize,
                nodeSize: toolbarState.nodeSize,
              };

              updatedNodes.push(newNode);
              updatedLinks.push({
                source: parentNode.id,
                target: newNode.id,
                thickness: toolbarState.lineThickness,
                color: "#555",
              });

              // If this child has further children, process them recursively
              if (child.children && child.children.length > 0) {
                processHierarchy(newNode, { [child.id]: child.children });
              }
            });
          });
        }

        // Find the parent node in the existing dataset
        const parentNode = updatedNodes.find(
          (node) => node.label === label.label
        );
        if (!parentNode) return prevData;

        setSubMindMapParentNode(parentNode);
        processHierarchy(parentNode, newSubMindMap);

        return { nodes: updatedNodes, links: updatedLinks };
      });
    } catch (error) {
      console.error("Error fetching sub-mind map:", error);
      alert("An error occurred while fetching the sub-mind map.");
    }
  }

  async function fetchNodeDescription(node) {
    try {
      console.log("For description", subMindMapParentNode);
      console.log(node.label);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `If ${subMindMapParentNode.label} is not undefined then give the description for  it else Based on the data given in:\n ${extractedText}, generate a description for ${node.label} based on your self knowledge base. If the given data is empty, then generate a description for ${node.label} based on ${description}.`;
      const result = await model.generateContent([prompt]);
      const response = await result.response;
      const content =
        response.candidates[0].content.parts[0].text ||
        "No description available.";
      alert(`Description for "${node.label}":\n${content}`);
    } catch (error) {
      console.error("Error fetching description:", error);
      alert("An error occurred while fetching the description.");
    }
  }

  // Function to apply node styling to selected nodes
  const applyNodeStyle = (property, value) => {
    if (selectedNodes.length === 0) return;

    setData((prevData) => {
      const updatedNodes = prevData.nodes.map((node) => {
        if (selectedNodes.includes(node.id)) {
          return { ...node, [property]: value };
        }
        return node;
      });

      saveToUndoStack();
      return { ...prevData, nodes: updatedNodes };
    });
  };

  // Function to apply link styling
  const applyLinkStyle = (property, value) => {
    if (selectedNodes.length === 0) return;

    setData((prevData) => {
      const updatedLinks = prevData.links.map((link) => {
        if (
          selectedNodes.includes(link.source.id) ||
          selectedNodes.includes(link.target.id)
        ) {
          return { ...link, [property]: value };
        }
        return link;
      });

      saveToUndoStack();
      return { ...prevData, links: updatedLinks };
    });
  };

  // Function to add a new node
  const addNewNode = () => {
    const newNodeId = `node-${Date.now()}`;
    const newNode = {
      id: newNodeId,
      label: "New Node",
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      color: toolbarState.activeColor,
      textSize: toolbarState.textSize,
      nodeSize: toolbarState.nodeSize,
    };

    setData((prevData) => {
      saveToUndoStack();
      return {
        nodes: [...prevData.nodes, newNode],
        links: prevData.links,
      };
    });

    setSelectedNodes([newNodeId]);
  };

  // Function to connect selected nodes
  const connectNodes = () => {
    if (selectedNodes.length !== 2) {
      alert("Please select exactly two nodes to connect");
      return;
    }

    const [source, target] = selectedNodes;

    setData((prevData) => {
      // Check if link already exists
      const linkExists = prevData.links.some(
        (link) =>
          (link.source.id === source && link.target.id === target) ||
          (link.source.id === target && link.target.id === source)
      );

      if (linkExists) {
        alert("These nodes are already connected");
        return prevData;
      }

      saveToUndoStack();
      return {
        nodes: prevData.nodes,
        links: [
          ...prevData.links,
          {
            source,
            target,
            thickness: toolbarState.lineThickness,
            color: "#555",
          },
        ],
      };
    });
  };

  // Function to delete selected nodes
  const deleteSelectedNodes = () => {
    if (selectedNodes.length === 0) return;

    setData((prevData) => {
      const updatedNodes = prevData.nodes.filter(
        (node) => !selectedNodes.includes(node.id)
      );
      const updatedLinks = prevData.links.filter(
        (link) =>
          !selectedNodes.includes(link.source.id) &&
          !selectedNodes.includes(link.target.id)
      );

      saveToUndoStack();
      return {
        nodes: updatedNodes,
        links: updatedLinks,
      };
    });

    setSelectedNodes([]);
  };

  // Function to align selected nodes
  const alignNodes = (direction) => {
    if (selectedNodes.length <= 1) {
      alert("Please select at least two nodes to align");
      return;
    }

    setData((prevData) => {
      const selectedNodesData = prevData.nodes.filter((node) =>
        selectedNodes.includes(node.id)
      );

      // Calculate target position
      let targetValue;
      if (direction === "horizontal") {
        // Align to average y
        targetValue =
          selectedNodesData.reduce((sum, node) => sum + node.y, 0) /
          selectedNodesData.length;
      } else {
        // Align to average x
        targetValue =
          selectedNodesData.reduce((sum, node) => sum + node.x, 0) /
          selectedNodesData.length;
      }

      const updatedNodes = prevData.nodes.map((node) => {
        if (selectedNodes.includes(node.id)) {
          if (direction === "horizontal") {
            return { ...node, y: targetValue, fy: targetValue };
          } else {
            return { ...node, x: targetValue, fx: targetValue };
          }
        }
        return node;
      });

      saveToUndoStack();
      return {
        ...prevData,
        nodes: updatedNodes,
      };
    });
  };

  // Function to distribute nodes evenly
  const distributeNodes = (direction) => {
    if (selectedNodes.length <= 2) {
      alert("Please select at least three nodes to distribute");
      return;
    }

    setData((prevData) => {
      const selectedNodesData = prevData.nodes
        .filter((node) => selectedNodes.includes(node.id))
        .sort((a, b) => (direction === "horizontal" ? a.x - b.x : a.y - b.y));

      // Find the range
      const minPos =
        direction === "horizontal"
          ? selectedNodesData[0].x
          : selectedNodesData[0].y;

      const maxPos =
        direction === "horizontal"
          ? selectedNodesData[selectedNodesData.length - 1].x
          : selectedNodesData[selectedNodesData.length - 1].y;

      const spacing = (maxPos - minPos) / (selectedNodesData.length - 1);

      const positionMap = {};
      selectedNodesData.forEach((node, index) => {
        positionMap[node.id] = minPos + index * spacing;
      });

      const updatedNodes = prevData.nodes.map((node) => {
        if (selectedNodes.includes(node.id)) {
          if (direction === "horizontal") {
            return {
              ...node,
              x: positionMap[node.id],
              fx: positionMap[node.id],
            };
          } else {
            return {
              ...node,
              y: positionMap[node.id],
              fy: positionMap[node.id],
            };
          }
        }
        return node;
      });

      saveToUndoStack();
      return {
        ...prevData,
        nodes: updatedNodes,
      };
    });
  };

  // Function to export the mind map as SVG
  const exportMindMap = (format) => {
    const svgElement = svgRef.current;

    if (format === "svg") {
      // Create a copy of the SVG element
      const svgCopy = svgElement.cloneNode(true);

      // Convert SVG to string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgCopy);

      // Create a Blob from the SVG string
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);

      // Create a download link and trigger it
      const a = document.createElement("a");
      a.href = url;
      a.download = "mindmap.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === "json") {
      // Export mind map data as JSON
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "mindmap.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // CSS styles for the canvas editor
  const editorStyles = {
    container: {
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
    },
    toolbar: {
      position: "absolute",
      top: isToolbarVisible ? "0" : "-50px",
      left: "0",
      right: "0",
      backgroundColor: "#333",
      color: "white",
      padding: "8px",
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      zIndex: 1000,
      transition: "top 0.3s ease",
    },
    toggleButton: {
      position: "absolute",
      top: isToolbarVisible ? "48px" : "0",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "#333",
      color: "white",
      border: "none",
      borderRadius: "0 0 6px 6px",
      padding: "4px 10px",
      cursor: "pointer",
      zIndex: 1000,
    },
    toolbarButton: {
      backgroundColor: "#555",
      color: "white",
      border: "none",
      borderRadius: "4px",
      padding: "6px 12px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    toolbarButtonActive: {
      backgroundColor: "#007bff",
    },
    toolbarGroup: {
      display: "flex",
      gap: "4px",
      alignItems: "center",
      padding: "0 8px",
      borderRight: "1px solid #666",
    },
    colorPicker: {
      width: "28px",
      height: "28px",
      padding: "0",
      border: "none",
      cursor: "pointer",
    },
    rangeInput: {
      width: "80px",
    },
    canvasArea: {
      width: "100%",
      height: "calc(100vh - 60px)",
      marginTop: "60px",
      position: "relative",
    },
  };

  return (
    <div ref={canvasContainerRef} style={editorStyles.container}>
      {/* Canvas Toolbar */}
      <div style={editorStyles.toolbar}>
        <div style={editorStyles.toolbarGroup}>
          <button
            style={editorStyles.toolbarButton}
            onClick={addNewNode}
            title="Add New Node"
          >
            + Node
          </button>
          <button
            style={editorStyles.toolbarButton}
            onClick={connectNodes}
            title="Connect Selected Nodes"
            disabled={selectedNodes.length !== 2}
          >
            Connect
          </button>
          <button
            style={editorStyles.toolbarButton}
            onClick={deleteSelectedNodes}
            title="Delete Selected"
            disabled={selectedNodes.length === 0}
          >
            Delete
          </button>
        </div>

        <div style={editorStyles.toolbarGroup}>
          <button
            style={{
              ...editorStyles.toolbarButton,
              ...(isPanning ? editorStyles.toolbarButtonActive : {}),
            }}
            onClick={() => setIsPanning(!isPanning)}
            title="Pan Tool"
          >
            🤚 Pan
          </button>
          <button
            style={{
              ...editorStyles.toolbarButton,
              ...(isSelecting ? editorStyles.toolbarButtonActive : {}),
            }}
            onClick={() => setIsSelecting(!isSelecting)}
            title="Selection Tool"
          >
            ◻️ Select
          </button>
        </div>

        <div style={editorStyles.toolbarGroup}>
          <span>Color:</span>
          <input
            type="color"
            value={toolbarState.activeColor}
            onChange={(e) => {
              setToolbarState((prev) => ({
                ...prev,
                activeColor: e.target.value,
              }));
              if (selectedNodes.length > 0) {
                applyNodeStyle("color", e.target.value);
              }
            }}
            style={editorStyles.colorPicker}
            title="Node Color"
          />
          <span>BG:</span>
          <input
            type="color"
            value={toolbarState.backgroundColor}
            onChange={(e) =>
              setToolbarState((prev) => ({
                ...prev,
                backgroundColor: e.target.value,
              }))
            }
            style={editorStyles.colorPicker}
            title="Background Color"
          />
        </div>

        <div style={editorStyles.toolbarGroup}>
          <span>Size:</span>
          <input
            type="range"
            min="5"
            max="30"
            value={toolbarState.nodeSize}
            onChange={(e) => {
              const newSize = parseInt(e.target.value);
              setToolbarState((prev) => ({ ...prev, nodeSize: newSize }));
              if (selectedNodes.length > 0) {
                applyNodeStyle("nodeSize", newSize);
              }
            }}
            style={editorStyles.rangeInput}
            title="Node Size"
          />
          <span>Line:</span>
          <input
            type="range"
            min="1"
            max="8"
            value={toolbarState.lineThickness}
            onChange={(e) => {
              const newThickness = parseInt(e.target.value);
              setToolbarState((prev) => ({
                ...prev,
                lineThickness: newThickness,
              }));
              if (selectedNodes.length > 0) {
                applyLinkStyle("thickness", newThickness);
              }
            }}
            style={editorStyles.rangeInput}
            title="Line Thickness"
          />
        </div>

        <div style={editorStyles.toolbarGroup}>
          <span>Text:</span>
          <select
            value={toolbarState.textSize}
            onChange={(e) => {
              setToolbarState((prev) => ({
                ...prev,
                textSize: e.target.value,
              }));
              if (selectedNodes.length > 0) {
                applyNodeStyle("textSize", e.target.value);
              }
            }}
            title="Text Size"
          >
            <option value="12px">Small</option>
            <option value="18px">Medium</option>
            <option value="24px">Large</option>
          </select>
        </div>

        <div style={editorStyles.toolbarGroup}>
          <button
            style={editorStyles.toolbarButton}
            onClick={() => alignNodes("horizontal")}
            title="Align Horizontally"
            disabled={selectedNodes.length <= 1}
          >
            ↔️ Align
          </button>
          <button
            style={editorStyles.toolbarButton}
            onClick={() => alignNodes("vertical")}
            title="Align Vertically"
            disabled={selectedNodes.length <= 1}
          >
            ↕️ Align
          </button>
          <button
            style={editorStyles.toolbarButton}
            onClick={() => distributeNodes("horizontal")}
            title="Distribute Horizontally"
            disabled={selectedNodes.length <= 2}
          >
            ⇹ Distribute
          </button>
          <button
            style={editorStyles.toolbarButton}
            onClick={() => distributeNodes("vertical")}
            title="Distribute Vertically"
            disabled={selectedNodes.length <= 2}
          >
            ⇳ Distribute
          </button>
        </div>

        <div style={editorStyles.toolbarGroup}>
          <button
            style={editorStyles.toolbarButton}
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo"
          >
            ↩️ Undo
          </button>
          <button
            style={editorStyles.toolbarButton}
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo"
          >
            ↪️ Redo
          </button>
        </div>

        <div style={editorStyles.toolbarGroup}>
          <button
            style={{
              ...editorStyles.toolbarButton,
              ...(toolbarState.isGridVisible
                ? editorStyles.toolbarButtonActive
                : {}),
            }}
            onClick={() =>
              setToolbarState((prev) => ({
                ...prev,
                isGridVisible: !prev.isGridVisible,
              }))
            }
            title="Toggle Grid"
          >
            # Grid
          </button>
          {toolbarState.isGridVisible && (
            <input
              type="range"
              min="10"
              max="50"
              step="10"
              value={toolbarState.gridSize}
              onChange={(e) =>
                setToolbarState((prev) => ({
                  ...prev,
                  gridSize: parseInt(e.target.value),
                }))
              }
              style={editorStyles.rangeInput}
              title="Grid Size"
            />
          )}
        </div>

        <div style={editorStyles.toolbarGroup}>
          <button
            style={editorStyles.toolbarButton}
            onClick={() => exportMindMap("svg")}
            title="Export as SVG"
          >
            Export SVG
          </button>
          <button
            style={editorStyles.toolbarButton}
            onClick={() => exportMindMap("json")}
            title="Export as JSON"
          >
            Export JSON
          </button>
        </div>
      </div>

      <button
        style={editorStyles.toggleButton}
        onClick={() => setIsToolbarVisible(!isToolbarVisible)}
      >
        {isToolbarVisible ? "▲ Hide Toolbar" : "▼ Show Toolbar"}
      </button>

      <div style={editorStyles.canvasArea}>
        <svg
          ref={svgRef}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
};

export default Mindmap;
