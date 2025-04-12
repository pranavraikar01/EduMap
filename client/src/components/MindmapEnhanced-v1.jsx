import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveAs } from "file-saver";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const Mindmap = ({ skeleton, extractedText, description }) => {
  const svgRef = useRef();
  const canvasRef = useRef();
  const [data, setData] = useState({ nodes: [], links: [] });
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [subMindMapParentNode, setSubMindMapParentNode] = useState("");
  const [selectedTool, setSelectedTool] = useState("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState([]);
  const [canvasElements, setCanvasElements] = useState([]);
  const [colors, setColors] = useState({
    node: "#1e90ff",
    root: "#ff5733",
    line: "#555",
    drawing: "#000000",
  });
  const [selectedNode, setSelectedNode] = useState(null);

  // Initialize data from skeleton
  useEffect(() => {
    if (!skeleton) return;

    const nodes = new Map();
    const links = [];

    nodes.set("root", {
      id: "root",
      label: "Root",
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
    });

    Object.entries(skeleton).forEach(([parentId, children]) => {
      if (!nodes.has(parentId)) {
        nodes.set(parentId, {
          id: parentId,
          label: `Node ${parentId}`,
          x: Math.random() * canvasSize.width,
          y: Math.random() * canvasSize.height,
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
          });
        }
        links.push({ source: parentId, target: child.id });
      });
    });

    setData({ nodes: Array.from(nodes.values()), links });
  }, [skeleton, canvasSize]);

  // Setup D3 force simulation and rendering
  useEffect(() => {
    if (!data.nodes.length) return;

    const svg = d3
      .select(svgRef.current)
      .attr("width", canvasSize.width)
      .attr("height", canvasSize.height)
      .style("background", "transparent");

    svg.selectAll("*").remove();
    const g = svg.append("g");

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
      .attr("stroke", colors.line)
      .attr("stroke-width", 2);

    const node = g
      .append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(
        d3
          .drag()
          .on("start", function (event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", function (event, d) {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", function (event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", function (event, d) {
        event.stopPropagation();
        setSelectedNode(d);
      });

    node
      .append("circle")
      .attr("r", 15)
      .attr("fill", (d) =>
        selectedNode && selectedNode.id === d.id
          ? "#ffcc00"
          : d.id === "root"
          ? colors.root
          : colors.node
      )
      .attr("stroke", "#000")
      .attr(
        "stroke-width",
        selectedNode && selectedNode.id === d.id ? "2px" : "0px"
      );

    const text = node
      .append("text")
      .text((d) => d.label)
      .attr("x", 20)
      .attr("y", 5)
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("cursor", "pointer")
      .on("dblclick", function (event, d) {
        event.stopPropagation();
        const newText = prompt("Edit node label:", d.label);
        if (newText) {
          d.label = newText;
          setData((prev) => ({ ...prev }));
        }
      });

    node.each(function (d) {
      const textElement = d3.select(this).select("text");
      const textWidth = textElement.node().getBBox().width;

      // Info button
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

      // Expand button
      d3.select(this)
        .append("text")
        .attr("x", 45 + textWidth)
        .attr("y", 5)
        .attr("font-size", "16px")
        .attr("fill", "green")
        .attr("cursor", "pointer")
        .text("➕")
        .on("click", async (event) => {
          event.stopPropagation();
          await expandNode(d);
        });

      // Delete button
      d3.select(this)
        .append("text")
        .attr("x", 65 + textWidth)
        .attr("y", 5)
        .attr("font-size", "16px")
        .attr("fill", "red")
        .attr("cursor", "pointer")
        .text("✖")
        .on("click", (event) => {
          event.stopPropagation();
          deleteNode(d);
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

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
  }, [data, canvasSize, colors, selectedNode]);

  // Canvas drawing functions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all canvas elements
    canvasElements.forEach((element) => {
      ctx.beginPath();
      ctx.strokeStyle = element.color || colors.drawing;
      ctx.lineWidth = element.width || 2;

      if (element.type === "freehand" && element.points.length > 1) {
        ctx.moveTo(element.points[0].x, element.points[0].y);
        for (let i = 1; i < element.points.length; i++) {
          ctx.lineTo(element.points[i].x, element.points[i].y);
        }
        ctx.stroke();
      } else if (element.type === "rectangle") {
        ctx.strokeRect(element.x, element.y, element.width, element.height);
      } else if (element.type === "circle") {
        ctx.arc(element.x, element.y, element.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (element.type === "arrow") {
        drawArrow(ctx, element.start, element.end);
      } else if (element.type === "text") {
        ctx.font = `${element.size || 16}px Arial`;
        ctx.fillStyle = element.color || colors.drawing;
        ctx.fillText(element.text, element.x, element.y);
      }
    });

    // Draw current path if drawing
    if (isDrawing && drawingPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = colors.drawing;
      ctx.lineWidth = 2;
      ctx.moveTo(drawingPath[0].x, drawingPath[0].y);
      for (let i = 1; i < drawingPath.length; i++) {
        ctx.lineTo(drawingPath[i].x, drawingPath[i].y);
      }
      ctx.stroke();
    }
  }, [canvasElements, drawingPath, isDrawing, colors]);

  const handleCanvasMouseDown = (e) => {
    if (selectedTool === "select") {
      setSelectedNode(null);
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    if (selectedTool === "freehand") {
      setDrawingPath([{ x, y }]);
    } else if (selectedTool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        setCanvasElements((prev) => [
          ...prev,
          {
            type: "text",
            text,
            x,
            y,
            color: colors.drawing,
            size: 16,
          },
        ]);
      }
    } else {
      setCanvasElements((prev) => [
        ...prev,
        {
          type: selectedTool,
          start: { x, y },
          end: { x, y },
          color: colors.drawing,
          ...(selectedTool === "circle" ? { radius: 0 } : {}),
          ...(selectedTool === "rectangle" ? { width: 0, height: 0 } : {}),
        },
      ]);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || selectedTool === "select" || selectedTool === "text")
      return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedTool === "freehand") {
      setDrawingPath((prev) => [...prev, { x, y }]);
    } else if (canvasElements.length > 0) {
      const lastIndex = canvasElements.length - 1;
      const updatedElements = [...canvasElements];
      updatedElements[lastIndex].end = { x, y };

      if (selectedTool === "rectangle") {
        updatedElements[lastIndex].width =
          x - updatedElements[lastIndex].start.x;
        updatedElements[lastIndex].height =
          y - updatedElements[lastIndex].start.y;
      } else if (selectedTool === "circle") {
        const dx = x - updatedElements[lastIndex].start.x;
        const dy = y - updatedElements[lastIndex].start.y;
        updatedElements[lastIndex].radius = Math.sqrt(dx * dx + dy * dy);
        updatedElements[lastIndex].x = updatedElements[lastIndex].start.x;
        updatedElements[lastIndex].y = updatedElements[lastIndex].start.y;
      }

      setCanvasElements(updatedElements);
    }
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (selectedTool === "freehand" && drawingPath.length > 1) {
      setCanvasElements((prev) => [
        ...prev,
        {
          type: "freehand",
          points: [...drawingPath],
          color: colors.drawing,
        },
      ]);
    }

    setDrawingPath([]);
  };

  const drawArrow = (ctx, start, end) => {
    const headLength = 15;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // Draw line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw arrow head
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = colors.drawing;
    ctx.fill();
  };

  const deleteNode = (node) => {
    if (node.id === "root") {
      alert("Cannot delete root node");
      return;
    }

    if (window.confirm(`Delete node "${node.label}"?`)) {
      setData((prev) => ({
        nodes: prev.nodes.filter((n) => n.id !== node.id),
        links: prev.links.filter(
          (l) => l.source !== node.id && l.target !== node.id
        ),
      }));
      if (selectedNode && selectedNode.id === node.id) {
        setSelectedNode(null);
      }
    }
  };

  const clearCanvas = () => {
    if (window.confirm("Clear all drawings?")) {
      setCanvasElements([]);
    }
  };

  const changeColor = (element, newColor) => {
    setColors((prev) => ({ ...prev, [element]: newColor }));
  };

  const downloadAsPNG = () => {
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvasSize.width;
    exportCanvas.height = canvasSize.height;
    const ctx = exportCanvas.getContext("2d");

    // Draw canvas elements first
    ctx.drawImage(canvas, 0, 0);

    // Draw SVG
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      exportCanvas.toBlob((blob) => {
        saveAs(blob, "mindmap.png");
      });
    };

    img.src = url;
  };

  // Gemini API functions
  async function expandNode(label) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Based on the data given in:\n ${extractedText}, generate a JSON structured sub-mind map for ${label.label}. The hierarchy must resemble the following structure:  
      { "1": [{ "id": "2", "data": { "label": "Example" }, "type": "editableNode" }] }  
      Return only valid JSON.`;

      const result = await model.generateContent([prompt]);
      const response = await result.response;
      let content = response.candidates[0].content.parts[0].text;

      content = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const newSubMindMap = JSON.parse(content);

      setData((prevData) => {
        const updatedNodes = [...prevData.nodes];
        const updatedLinks = [...prevData.links];

        function processHierarchy(parentNode, hierarchy) {
          Object.entries(hierarchy).forEach(([parentId, children]) => {
            children.forEach((child) => {
              if (!child || !child.id || !child.data) return;

              const newNode = {
                id: child.id,
                label: child.data.label,
                x: parentNode.x + Math.random() * 150 - 75,
                y: parentNode.y + Math.random() * 150 - 75,
              };

              updatedNodes.push(newNode);
              updatedLinks.push({ source: parentNode.id, target: newNode.id });

              if (child.children && child.children.length > 0) {
                processHierarchy(newNode, { [child.id]: child.children });
              }
            });
          });
        }

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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `If ${subMindMapParentNode?.label} is not undefined then give the description for it else Based on the data given in:\n ${extractedText}, generate a description for ${node.label} based on your self knowledge base. If the given data is empty, then generate a description for ${node.label} based on ${description}.`;
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

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Canvas for drawing */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
          pointerEvents: "auto",
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      />

      {/* D3 SVG Mindmap */}
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: selectedTool === "select" ? "auto" : "none",
        }}
      />

      {/* Toolbar */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 3,
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        <h4 style={{ margin: "0 0 5px 0" }}>Tools</h4>

        <div style={{ display: "flex", gap: "5px" }}>
          <button
            style={{
              backgroundColor: selectedTool === "select" ? "#ddd" : "white",
              border: "1px solid #ccc",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTool("select")}
            title="Select nodes"
          >
            Select
          </button>
        </div>

        <h4 style={{ margin: "10px 0 5px 0" }}>Drawing Tools</h4>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          <button
            style={{
              backgroundColor: selectedTool === "freehand" ? "#ddd" : "white",
              border: "1px solid #ccc",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTool("freehand")}
            title="Freehand drawing"
          >
            ✏️
          </button>

          <button
            style={{
              backgroundColor: selectedTool === "rectangle" ? "#ddd" : "white",
              border: "1px solid #ccc",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTool("rectangle")}
            title="Rectangle"
          >
            ▭
          </button>

          <button
            style={{
              backgroundColor: selectedTool === "circle" ? "#ddd" : "white",
              border: "1px solid #ccc",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTool("circle")}
            title="Circle"
          >
            ○
          </button>

          <button
            style={{
              backgroundColor: selectedTool === "arrow" ? "#ddd" : "white",
              border: "1px solid #ccc",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTool("arrow")}
            title="Arrow"
          >
            →
          </button>

          <button
            style={{
              backgroundColor: selectedTool === "text" ? "#ddd" : "white",
              border: "1px solid #ccc",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={() => setSelectedTool("text")}
            title="Add text"
          >
            T
          </button>
        </div>

        <div style={{ marginTop: "10px" }}>
          <label>Colors:</label>
          <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
            <div>
              <div style={{ fontSize: "12px" }}>Drawing</div>
              <input
                type="color"
                value={colors.drawing}
                onChange={(e) => changeColor("drawing", e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px" }}>Node</div>
              <input
                type="color"
                value={colors.node}
                onChange={(e) => changeColor("node", e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px" }}>Root</div>
              <input
                type="color"
                value={colors.root}
                onChange={(e) => changeColor("root", e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: "12px" }}>Line</div>
              <input
                type="color"
                value={colors.line}
                onChange={(e) => changeColor("line", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
          <button
            style={{
              backgroundColor: "#ff6b6b",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={clearCanvas}
            title="Clear drawings"
          >
            Clear Canvas
          </button>

          <button
            style={{
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={downloadAsPNG}
            title="Download as PNG"
          >
            Download PNG
          </button>
        </div>

        {selectedNode && (
          <div
            style={{
              marginTop: "10px",
              padding: "10px",
              backgroundColor: "#f5f5f5",
              borderRadius: "5px",
            }}
          >
            <h4 style={{ margin: "0 0 5px 0" }}>Selected Node</h4>
            <div>Label: {selectedNode.label}</div>
            <button
              style={{
                backgroundColor: "#ff9800",
                color: "white",
                border: "none",
                padding: "5px 10px",
                borderRadius: "3px",
                cursor: "pointer",
                marginTop: "5px",
              }}
              onClick={() => {
                const newLabel = prompt("Edit node label:", selectedNode.label);
                if (newLabel) {
                  setData((prev) => ({
                    nodes: prev.nodes.map((n) =>
                      n.id === selectedNode.id ? { ...n, label: newLabel } : n
                    ),
                    links: prev.links,
                  }));
                }
              }}
            >
              Edit Label
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mindmap;
