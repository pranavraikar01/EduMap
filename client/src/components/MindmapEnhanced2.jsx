import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
        d3.drag().on("start", dragStart).on("drag", dragged).on("end", dragEnd)
      );

    node
      .append("circle")
      .attr("r", 15)
      .attr("fill", (d) => (d.id === "root" ? colors.root : colors.node));

    const text = node
      .append("text")
      .text((d) => d.label)
      .attr("x", 20)
      .attr("y", 5)
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("cursor", "pointer")
      .on("dblclick", editNodeText);

    node.each(function (d) {
      const textElement = d3.select(this).select("text");
      const textWidth = textElement.node().getBBox().width;

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

    function dragStart(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnd(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    function editNodeText(event, d) {
      event.stopPropagation();
      const newText = prompt("Edit node label:", d.label);
      if (newText) {
        d.label = newText;
        setData((prev) => ({ ...prev }));
      }
    }
  }, [data, canvasSize, colors]);

  // Canvas drawing functions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw all elements
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
    if (selectedTool === "select") return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    if (selectedTool === "freehand") {
      setDrawingPath([{ x, y }]);
    } else {
      setDrawingPath([]);
      setCanvasElements((prev) => [
        ...prev,
        {
          type: selectedTool,
          start: { x, y },
          end: { x, y },
          color: colors.drawing,
        },
      ]);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing) return;

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

  const clearCanvas = () => {
    setCanvasElements([]);
  };

  const changeColor = (element, newColor) => {
    if (element === "drawing") {
      setColors((prev) => ({ ...prev, drawing: newColor }));
    } else if (element === "node") {
      setColors((prev) => ({ ...prev, node: newColor }));
    } else if (element === "root") {
      setColors((prev) => ({ ...prev, root: newColor }));
    } else if (element === "line") {
      setColors((prev) => ({ ...prev, line: newColor }));
    }
  };

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

      content = content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const newSubMindMap = JSON.parse(content);
      console.log("New submindmap", newSubMindMap);

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
          pointerEvents: selectedTool === "select" ? "none" : "auto",
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
          pointerEvents: "auto",
        }}
      />

      {/* Canvas Toolbar */}
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
        <h4 style={{ margin: "0 0 5px 0" }}>Canvas Tools</h4>

        <button
          style={{
            backgroundColor: selectedTool === "select" ? "#ddd" : "white",
            border: "1px solid #ccc",
            padding: "5px 10px",
            borderRadius: "3px",
            cursor: "pointer",
          }}
          onClick={() => setSelectedTool("select")}
        >
          Select
        </button>

        <button
          style={{
            backgroundColor: selectedTool === "freehand" ? "#ddd" : "white",
            border: "1px solid #ccc",
            padding: "5px 10px",
            borderRadius: "3px",
            cursor: "pointer",
          }}
          onClick={() => setSelectedTool("freehand")}
        >
          Freehand
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
        >
          Rectangle
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
        >
          Circle
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
        >
          Arrow
        </button>

        <div style={{ marginTop: "10px" }}>
          <label>Drawing Color:</label>
          <input
            type="color"
            value={colors.drawing}
            onChange={(e) => changeColor("drawing", e.target.value)}
            style={{ marginLeft: "5px" }}
          />
        </div>

        <div>
          <label>Node Color:</label>
          <input
            type="color"
            value={colors.node}
            onChange={(e) => changeColor("node", e.target.value)}
            style={{ marginLeft: "5px" }}
          />
        </div>

        <div>
          <label>Root Color:</label>
          <input
            type="color"
            value={colors.root}
            onChange={(e) => changeColor("root", e.target.value)}
            style={{ marginLeft: "5px" }}
          />
        </div>

        <div>
          <label>Line Color:</label>
          <input
            type="color"
            value={colors.line}
            onChange={(e) => changeColor("line", e.target.value)}
            style={{ marginLeft: "5px" }}
          />
        </div>

        <button
          style={{
            backgroundColor: "#ff6b6b",
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "3px",
            cursor: "pointer",
            marginTop: "10px",
          }}
          onClick={clearCanvas}
        >
          Clear Canvas
        </button>
      </div>
    </div>
  );
};

export default Mindmap;
