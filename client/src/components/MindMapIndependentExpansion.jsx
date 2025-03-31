import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const Mindmap = ({ skeleton, extractedText, description }) => {
  const svgRef = useRef();
  const [data, setData] = useState({ nodes: [], links: [] });
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [subMindMapParentNode, setSubMindMapParentNode] = useState("");

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
      .style("background", "#f0f0f0");

    svg.selectAll("*").remove(); // Clear previous drawings
    const g = svg.append("g"); // Group for zooming & panning

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
      .attr("stroke", "#555")
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
      .attr("fill", (d) => (d.id === "root" ? "#ff5733" : "#1e90ff"));

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
  }, [data, canvasSize]);

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
              };

              updatedNodes.push(newNode);
              updatedLinks.push({ source: parentNode.id, target: newNode.id });

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

  return <svg ref={svgRef} style={{ display: "block" }} />;
};

export default Mindmap;
