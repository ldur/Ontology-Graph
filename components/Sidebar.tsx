import React, { useState } from 'react';
import { OntologyNode, OntologyEdge } from '../types';
import { Plus, Trash2, Edit2, Wand2, Link2, X } from 'lucide-react';

interface SidebarProps {
  selectedNode: OntologyNode | null;
  selectedEdge: OntologyEdge | null;
  isGenerating: boolean;
  onGenerate: (prompt: string) => void;
  onUpdateNode: (node: OntologyNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onAddNode: () => void;
  onStartConnection: (sourceId: string) => void;
  nodes: OntologyNode[];
  onAddEdge: (sourceId: string, targetId: string, label: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedNode,
  selectedEdge,
  isGenerating,
  onGenerate,
  onUpdateNode,
  onDeleteNode,
  onDeleteEdge,
  onAddNode,
  onStartConnection,
  nodes,
  onAddEdge
}) => {
  const [prompt, setPrompt] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('related_to');
  const [edgeTarget, setEdgeTarget] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const handleConnectionStart = () => {
    if (selectedNode) {
      setIsConnecting(true);
      // Pre-select the first other node
      const otherNodes = nodes.filter(n => n.id !== selectedNode.id);
      if (otherNodes.length > 0) setEdgeTarget(otherNodes[0].id);
    }
  };

  const handleCreateEdge = () => {
    if (selectedNode && edgeTarget) {
      onAddEdge(selectedNode.id, edgeTarget, edgeLabel);
      setIsConnecting(false);
      setEdgeLabel('related_to');
    }
  };

  return (
    <div className="w-80 h-full bg-white border-l border-slate-200 flex flex-col shadow-xl z-10">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-indigo-600" />
          Ontology Graph
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* AI Generator Section */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">AI Generation</h3>
          <form onSubmit={handleGenerate} className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Solar System, Machine Learning, Medieval History..."
              className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-24 bg-slate-50 transition-all"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                isGenerating 
                  ? 'bg-indigo-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Thinking...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Graph
                </>
              )}
            </button>
          </form>
        </section>

        <hr className="border-slate-100" />

        {/* Properties Panel */}
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {selectedNode ? 'Node Properties' : selectedEdge ? 'Relationship Properties' : 'Properties'}
          </h3>
          
          {!selectedNode && !selectedEdge && (
             <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm">
               Select a node or edge to edit properties.
               <div className="mt-4">
                 <button onClick={onAddNode} className="text-indigo-600 font-medium hover:underline text-xs flex items-center justify-center gap-1 mx-auto">
                   <Plus className="w-3 h-3" /> Create Manual Node
                 </button>
               </div>
             </div>
          )}

          {selectedNode && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Label</label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => onUpdateNode({ ...selectedNode, label: e.target.value })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                <select
                  value={selectedNode.type}
                  onChange={(e) => onUpdateNode({ ...selectedNode, type: e.target.value as any })}
                  className="w-full p-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="class">Class</option>
                  <option value="instance">Instance</option>
                  <option value="concept">Concept</option>
                </select>
              </div>
              <div>
                 <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                 <textarea
                  value={selectedNode.description || ''}
                  onChange={(e) => onUpdateNode({ ...selectedNode, description: e.target.value })}
                  rows={3}
                  className="w-full p-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Node Actions */}
              <div className="pt-2 flex flex-col gap-2">
                {!isConnecting ? (
                  <button 
                    onClick={handleConnectionStart}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Link2 className="w-3 h-3" /> Connect to...
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-semibold text-slate-600">New Connection</span>
                       <button onClick={() => setIsConnecting(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3"/></button>
                    </div>
                    <div className="space-y-2">
                      <select 
                        className="w-full p-1.5 text-xs border rounded"
                        value={edgeTarget}
                        onChange={(e) => setEdgeTarget(e.target.value)}
                      >
                         {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                           <option key={n.id} value={n.id}>{n.label}</option>
                         ))}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Label (e.g. is_a)" 
                        className="w-full p-1.5 text-xs border rounded"
                        value={edgeLabel}
                        onChange={(e) => setEdgeLabel(e.target.value)}
                      />
                      <button 
                        onClick={handleCreateEdge}
                        className="w-full py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Add Link
                      </button>
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => onDeleteNode(selectedNode.id)}
                  className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-red-100"
                >
                  <Trash2 className="w-3 h-3" /> Delete Node
                </button>
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-4 animate-fadeIn">
               <div className="p-3 bg-slate-50 rounded text-xs text-slate-600 border border-slate-200 mb-2">
                 <strong>{(selectedEdge.source as any).label}</strong> → <strong>{(selectedEdge.target as any).label}</strong>
               </div>
               <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Relationship Label</label>
                <input
                  type="text"
                  value={selectedEdge.label}
                  disabled // Editing edge labels is tricky with D3 data binding without full update, kept read-only for now or delete/recreate
                  className="w-full p-2 text-sm border border-slate-200 rounded-md bg-slate-100 text-slate-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400 mt-1">To rename, delete and create a new link.</p>
              </div>
              <button 
                  onClick={() => onDeleteEdge(selectedEdge.id)}
                  className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-red-100 mt-4"
                >
                  <Trash2 className="w-3 h-3" /> Delete Link
              </button>
            </div>
          )}
        </section>

      </div>
      
      {/* Footer / Branding */}
      <div className="p-4 border-t border-slate-100 text-center text-slate-400 text-xs">
        Powered by Google Gemini 2.5
      </div>
    </div>
  );
};

export default Sidebar;