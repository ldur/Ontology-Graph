import React, { useState, useEffect, useRef } from 'react';
import GraphCanvas, { GraphCanvasRef } from './components/GraphCanvas';
import Sidebar from './components/Sidebar';
import { OntologyGraph, OntologyNode, OntologyEdge, SavedOntology } from './types';
import { generateOntology } from './services/geminiService';
import { Download, Save, FolderOpen, RefreshCcw } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ontology_app_saves';

function App() {
  const [graph, setGraph] = useState<OntologyGraph>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<OntologyEdge | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedOntologies, setSavedOntologies] = useState<SavedOntology[]>([]);
  const [showSaves, setShowSaves] = useState(false);
  
  const graphRef = useRef<GraphCanvasRef>(null);

  // Load saves on mount
  useEffect(() => {
    const saves = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saves) {
      try {
        setSavedOntologies(JSON.parse(saves));
      } catch (e) {
        console.error("Failed to parse saved ontologies");
      }
    }
  }, []);

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setSelectedNode(null);
    setSelectedEdge(null);
    try {
      const newGraph = await generateOntology(prompt);
      setGraph(newGraph);
    } catch (error) {
      alert("Failed to generate ontology. Please try again or check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateNode = (updatedNode: OntologyNode) => {
    setGraph(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
    }));
    // Also update selected node state to reflect changes immediately in UI
    setSelectedNode(updatedNode);
  };

  const handleDeleteNode = (nodeId: string) => {
    setGraph(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => {
        // Handle both string IDs and object references (D3 converts them)
        const sourceId = typeof e.source === 'object' ? (e.source as any).id : e.source;
        const targetId = typeof e.target === 'object' ? (e.target as any).id : e.target;
        return sourceId !== nodeId && targetId !== nodeId;
      })
    }));
    setSelectedNode(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    setGraph(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId)
    }));
    setSelectedEdge(null);
  };

  const handleAddNode = () => {
    const id = `node-${Date.now()}`;
    const newNode: OntologyNode = {
      id,
      label: 'New Node',
      type: 'concept',
      description: 'Manually added node'
    };
    setGraph(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNode(newNode);
  };

  const handleAddEdge = (sourceId: string, targetId: string, label: string) => {
     const newEdge: OntologyEdge = {
       id: `edge-${Date.now()}`,
       source: sourceId,
       target: targetId,
       label
     };
     setGraph(prev => ({
       ...prev,
       edges: [...prev.edges, newEdge]
     }));
  };

  const handleSave = () => {
    const name = prompt("Enter a name for this ontology:", `Ontology ${new Date().toLocaleDateString()}`);
    if (!name) return;

    // Get current graph state from canvas to ensure we capture latest positions (x, y)
    const currentGraph = graphRef.current ? graphRef.current.getGraph() : graph;

    // Clean nodes: Keep only necessary data + positions
    const cleanNodes = currentGraph.nodes.map(({ id, label, type, description, x, y }) => {
      const node: OntologyNode = { id, label, type, description };
      if (typeof x === 'number') node.x = x;
      if (typeof y === 'number') node.y = y;
      return node;
    });

    // Clean edges: Ensure source/target are string IDs (D3 converts them to objects)
    const cleanEdges = currentGraph.edges.map(e => ({
      id: e.id,
      source: typeof e.source === 'object' ? (e.source as any).id : e.source,
      target: typeof e.target === 'object' ? (e.target as any).id : e.target,
      label: e.label
    }));

    const newSave: SavedOntology = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      data: { nodes: cleanNodes, edges: cleanEdges }
    };

    const updatedSaves = [newSave, ...savedOntologies];
    setSavedOntologies(updatedSaves);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSaves));
    alert("Ontology saved locally!");
  };

  const handleLoad = (save: SavedOntology) => {
    if(window.confirm(`Load "${save.name}"? Unsaved changes will be lost.`)) {
       setGraph(save.data);
       setShowSaves(false);
       setSelectedNode(null);
       setSelectedEdge(null);
    }
  };

  const handleDeleteSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedOntologies.filter(s => s.id !== id);
    setSavedOntologies(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  const handleDownloadMarkdown = () => {
    let md = `# Ontology Export\n\n`;
    md += `## Nodes\n`;
    graph.nodes.forEach(n => {
      md += `- **${n.label}** (${n.type}): ${n.description || 'No description'}\n`;
    });
    md += `\n## Relationships\n`;
    graph.edges.forEach(e => {
      const sourceLabel = typeof e.source === 'object' ? (e.source as any).label : graph.nodes.find(n => n.id === e.source)?.label || 'Unknown';
      const targetLabel = typeof e.target === 'object' ? (e.target as any).label : graph.nodes.find(n => n.id === e.target)?.label || 'Unknown';
      md += `- ${sourceLabel} --[${e.label}]--> ${targetLabel}\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ontology.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if(window.confirm("Are you sure you want to clear the canvas?")) {
      setGraph({ nodes: [], edges: [] });
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 font-sans text-slate-900">
      
      {/* Sidebar */}
      <Sidebar 
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        onDeleteEdge={handleDeleteEdge}
        onAddNode={handleAddNode}
        onAddEdge={handleAddEdge}
        nodes={graph.nodes}
        onStartConnection={() => {}} // Handled inside Sidebar local state for simpler interaction
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative h-full">
        
        {/* Toolbar */}
        <div className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
               Ontology Graph
             </h1>
             <div className="h-6 w-px bg-slate-200"></div>
             <span className="text-sm text-slate-500">
               {graph.nodes.length} Nodes • {graph.edges.length} Relations
             </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleClear}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear Canvas"
            >
              <RefreshCcw className="w-5 h-5" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowSaves(!showSaves)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                <FolderOpen className="w-4 h-4" />
                Load
              </button>
              
              {/* Saved Ontologies Dropdown */}
              {showSaves && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                    SAVED ONTOLOGIES
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {savedOntologies.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No saved ontologies yet.</div>
                    ) : (
                      savedOntologies.map(save => (
                        <div 
                          key={save.id} 
                          onClick={() => handleLoad(save)}
                          className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-50 flex justify-between items-center group"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-800">{save.name}</div>
                            <div className="text-[10px] text-slate-400">{new Date(save.timestamp).toLocaleDateString()}</div>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteSave(save.id, e)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <span className="sr-only">Delete</span>
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            
            <button 
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export MD
            </button>
          </div>
        </div>

        {/* D3 Canvas */}
        <div className="flex-1 bg-slate-50 overflow-hidden">
           <GraphCanvas 
             ref={graphRef}
             graph={graph} 
             onNodeSelect={setSelectedNode} 
             onEdgeSelect={setSelectedEdge}
           />
        </div>
      </div>
    </div>
  );
}

export default App;