# Project Specification: Mermaid.js Visual Editor

## 1. Overview
A lightweight, browser-based tool to visually create and edit Mermaid.js diagrams. The editor focuses on a "What You See Is What You Get" (WYSIWYG) approach, allowing users to drag and drop elements to construct diagrams which are instantly compiled into valid Mermaid syntax.

## 2. Core Philosophy
- **Vanilla JavaScript**: No frameworks (React, Vue, Angular). Logic is written in plain, modern ES6+ JavaScript.
- **Explicit Logic**: DOM manipulation and state management are visible and follow standard web APIs.
- **Zero Build Step (Optional)**: The project should run directly in a browser or with a simple local server (e.g., Vite for HMR), without complex bundling configurations hiding the asset flow.

## 3. Scope & Phasing
Due to the widely different visual structures of Mermaid diagrams, the project will be built in phases:

### Phase 1: Flowchart MVP
- Focus entirely on **Flowcharts** (`graph TD/LR`).
- Support for Node types: Rectangle, Rounded, Circle, Rhombus.
- Support for Edge types: Arrow, Open, Dotted.
- One-way synchronization: Visual Editor -> Mermaid Code.

### Phase 2: Extensibility (Future)
- Refactor the editor engine to support other types (Sequence, State, Class diagrams) as separate modules.

## 4. User Interface (UI)
The screen is divided into three main sections:
1.  **Toolbar / Palette (Left)**:
    - Draggable shapes (Start, Process, Decision, End).
    - Connector tools.
2.  **Canvas (Center)**:
    - The interactive work area.
    - Elements can be selected, dragged, and connected.
    - Supports panning and zooming.
3.  **Code & Preview (Right/Bottom)**:
    - **Code View**: Read-only (or bi-directional in future) textarea showing generated Mermaid syntax.
    - **Live Preview**: The actual rendered SVG output from Mermaid.js to verify correctness.

## 5. Functional Requirements

### 5.1 Visual Editing
- **Add Nodes**: Drag shapes from the palette onto the canvas.
- **Edit Nodes**: Double-click a node to edit its label text.
- **Move Nodes**: Drag nodes around; connections update automatically.
- **Connect Nodes**: Click and drag from one node anchor to another to create a link.
- **Delete**: Select a node or link and press Delete/Backspace.

### 5.2 Code Generation
- The application maintains a lightweight internal model (JSON) of nodes and edges.
- On every change (mouseup, keyup), the internal model is converted to a Mermaid string.
- Example:
  ```mermaid
  graph TD
      A[Start] --> B{Is it working?}
      B -- Yes --> C[Great!]
      B -- No --> D[Debug]
  ```

### 5.3 Export & Persistence
- **Copy Code**: Button to copy the Mermaid syntax to clipboard.
- **Download Markdown**: Save as `.md` file with the diagram code block.
- **Download PNG**: Render the SVG to a canvas and save as image.
- **Load/Save**: (Future) Save the internal JSON model to file to restore the editing session.

## 6. Technical Architecture

### 6.1 Data Model
Simple, flat arrays to store state:
```javascript
const state = {
    nodes: [
        { id: "node1", type: "rect", text: "Start", x: 100, y: 100 },
        { id: "node2", type: "diamond", text: "Decision", x: 300, y: 100 }
    ],
    edges: [
        { from: "node1", to: "node2", label: "" }
    ]
};
```

### 6.2 Modules
- `main.js`: Initialization and event loop.
- `canvas.js`: Handling HTML5 Canvas or SVG interactions (drawing shapes, tracking mouse events).
- `generator.js`: Pure function transforming the `state` object into a Mermaid string.
- `ui.js`: Handling sidebar interactions and export buttons.

### 6.3 Libraries
- **Mermaid.js**: For rendering the preview.
- **No other heavy dependencies**.

## 7. Open Questions / Clarifications
- **Rendering Tech**: Should the interactive canvas use HTML `<div>` elements with absolute positioning (easiest for text editing), SVG (better for lines/connectors), or HTML5 Canvas (best for performance but hardest for text editing)? *Recommendation: SVG for connectors + HTML Divs for Nodes overlay.*
