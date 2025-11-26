import { GoogleGenAI, Type, Schema } from "@google/genai";
import { OntologyGraph } from "../types";

const apiKey = process.env.API_KEY || '';

// We define the schema for the ontology generation
const ontologySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique identifier for the node (snake_case)" },
          label: { type: Type.STRING, description: "Human readable label" },
          type: { type: Type.STRING, enum: ["class", "instance", "concept"], description: "The type of the entity" },
          description: { type: Type.STRING, description: "Short description of the entity" }
        },
        required: ["id", "label", "type"]
      }
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING, description: "ID of the source node" },
          target: { type: Type.STRING, description: "ID of the target node" },
          label: { type: Type.STRING, description: "Relationship label (predicate), e.g., 'is_a', 'part_of'" }
        },
        required: ["source", "target", "label"]
      }
    }
  },
  required: ["nodes", "edges"]
};

export const generateOntology = async (prompt: string): Promise<OntologyGraph> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a detailed ontology graph for the topic: "${prompt}". 
      Ensure the graph has a good mix of classes and instances/concepts. 
      Limit to about 15-25 nodes and appropriate relationships for a clear visualization.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: ontologySchema,
        systemInstruction: "You are an expert ontology engineer. You create precise knowledge graphs."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    
    // Post-process to ensure edges have IDs
    const edgesWithIds = (data.edges || []).map((edge: any, index: number) => ({
      ...edge,
      id: `edge-${index}-${Date.now()}`
    }));

    return {
      nodes: data.nodes || [],
      edges: edgesWithIds
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};