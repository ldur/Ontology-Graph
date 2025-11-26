import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import { OntologyGraph, OntologyNode, OntologyEdge } from '../types';

interface GraphCanvasProps {
  graph: OntologyGraph;
  onNodeSelect: (node: OntologyNode | null) => void;
  onEdgeSelect: (edge: OntologyEdge | null) => void;
}

export interface GraphCanvasRef {
  getGraph: () => OntologyGraph;
}

const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(({ graph, onNodeSelect, onEdgeSelect }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Keep track of simulation to stop it on unmount
  const simulationRef = useRef<d3.Simulation<OntologyNode, OntologyEdge> | null>(null);

  // We need to keep a stable reference to the data to avoid d3 recreating everything on every render
  // unless the actual data structure changed
  const [activeGraph, setActiveGraph] = useState<OntologyGraph>(graph);

  useImperativeHandle(ref, () => ({
    getGraph: () => {
      // Return the current state from the simulation nodes if available, otherwise activeGraph
      if (simulationRef.current) {
        return {
          nodes: simulationRef.current.nodes(),
          edges: activeGraph.edges // Edges are maintained in activeGraph state
        } as OntologyGraph;
      }
      return activeGraph;
    }
  }));

  useEffect(() => {
    // Create deep copy of new prop
    const newGraphData = JSON.parse(JSON.stringify(graph));

    // If we have an existing simulation, copy over positions to avoid layout reset
    if (simulationRef.current) {
       const currentNodesMap = new Map(simulationRef.current.nodes().map(n => [n.id, n]));
       newGraphData.nodes.forEach((n: OntologyNode) => {
         const existing = currentNodesMap.get(n.id);
         if (existing) {
           n.x = existing.x;
           n.y = existing.y;
           // Also preserve velocity for smoothness if we wanted, but x/y is enough for position
           if (existing.vx !== undefined) n.vx = existing.vx;
           if (existing.vy !== undefined) n.vy = existing.vy;
         }
       });
    }

    setActiveGraph(newGraphData);
  }, [graph]);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const width = wrapperRef.current.clientWidth;
    const height = wrapperRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Create a group for the graph content to allow zooming
    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Simulation setup
    const simulation = d3.forceSimulation<OntologyNode, OntologyEdge>(activeGraph.nodes)
      .force("link", d3.forceLink<OntologyNode, OntologyEdge>(activeGraph.edges).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    // Define arrow markers for graph edges
    svg.append("defs").selectAll("marker")
      .data(["end-arrow"])
      .enter().append("marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25) // Position of arrow relative to node center
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    // Draw lines for edges
    const link = g.append("g")
      .selectAll("line")
      .data(activeGraph.edges)
      .enter().append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#end-arrow)")
      .on("click", (event, d) => {
        event.stopPropagation();
        onEdgeSelect(d);
        onNodeSelect(null);
      });

    // Draw labels for edges (predicates)
    const linkLabel = g.append("g")
      .selectAll("text")
      .data(activeGraph.edges)
      .enter().append("text")
      .attr("class", "edge-label")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .attr("fill", "#64748b")
      .style("font-size", "10px")
      .style("pointer-events", "none") // Let clicks pass through to line
      .text(d => d.label);

    // Draw nodes
    const node = g.append("g")
      .selectAll("g")
      .data(activeGraph.nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, OntologyNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node circles
    node.append("circle")
      .attr("r", 18)
      .attr("fill", d => {
        switch (d.type) {
          case 'class': return '#3b82f6'; // blue
          case 'instance': return '#10b981'; // green
          case 'concept': return '#a855f7'; // purple
          default: return '#64748b'; // slate
        }
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "grab")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeSelect(d);
        onEdgeSelect(null);
      });

    // Node Labels
    node.append("text")
      .attr("dx", 22)
      .attr("dy", 5)
      .text(d => d.label)
      .style("font-size", "12px")
      .style("font-family", "sans-serif")
      .style("font-weight", "500")
      .attr("fill", "#334155")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)");

    // Background click deselects
    svg.on("click", () => {
      onNodeSelect(null);
      onEdgeSelect(null);
    });

    // Simulation tick update
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as OntologyNode).x!)
        .attr("y1", d => (d.source as OntologyNode).y!)
        .attr("x2", d => (d.target as OntologyNode).x!)
        .attr("y2", d => (d.target as OntologyNode).y!);

      linkLabel
        .attr("x", d => ((d.source as OntologyNode).x! + (d.target as OntologyNode).x!) / 2)
        .attr("y", d => ((d.source as OntologyNode).y! + (d.target as OntologyNode).y!) / 2);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, OntologyNode, unknown>, d: OntologyNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, OntologyNode, unknown>, d: OntologyNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, OntologyNode, unknown>, d: OntologyNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [activeGraph]); // Re-run if the activeGraph data structure changes entirely

  return (
    <div ref={wrapperRef} className="w-full h-full bg-slate-50 relative overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />
      <div className="absolute bottom-4 left-4 pointer-events-none">
         <div className="flex gap-4 text-xs font-medium text-slate-500 bg-white/80 p-2 rounded-lg shadow-sm border border-slate-200">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Class</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Instance</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Concept</span>
         </div>
      </div>
    </div>
  );
});

export default GraphCanvas;