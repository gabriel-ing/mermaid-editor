// Handles all canvas interactions

export function initCanvas(state, onUpdate) {
    const canvasContainer = document.getElementById('canvas-container');
    const nodesLayer = document.getElementById('nodes-layer');
    const connectionsLayer = document.getElementById('connections-layer');
    const subgraphsLayer = document.getElementById('subgraphs-layer');
    const draggableNodes = document.querySelectorAll('.draggable-node');
    const groupButton = document.getElementById('group-button');
    const addToSubgraphButton = document.getElementById('add-to-subgraph-button');
    const removeFromSubgraphButton = document.getElementById('remove-from-subgraph-button');
    const resetCanvasButton = document.getElementById('reset-canvas-button');
    const shapeDropdown = document.getElementById('shape-dropdown');
    const shapeDropdownToggle = document.getElementById('shape-dropdown-toggle');
    const shapeDropdownMenu = document.getElementById('shape-dropdown-menu');
    const themeSelect = document.getElementById('theme-select');
    const customThemeSettings = document.getElementById('custom-theme-settings');
    const themeBackground = document.getElementById('theme-background');
    const themeBackgroundHex = document.getElementById('theme-background-hex');
    const themePrimaryColor = document.getElementById('theme-primary-color');
    const themePrimaryColorHex = document.getElementById('theme-primary-color-hex');
    const themePrimaryBorderColor = document.getElementById('theme-primary-border-color');
    const themePrimaryBorderColorHex = document.getElementById('theme-primary-border-color-hex');
    const themePrimaryTextColor = document.getElementById('theme-primary-text-color');
    const themePrimaryTextColorHex = document.getElementById('theme-primary-text-color-hex');
    const themeLineColor = document.getElementById('theme-line-color');
    const themeLineColorHex = document.getElementById('theme-line-color-hex');
    const themeClusterBg = document.getElementById('theme-cluster-bg');
    const themeClusterBgHex = document.getElementById('theme-cluster-bg-hex');
    const themeClusterBorder = document.getElementById('theme-cluster-border');
    const themeClusterBorderHex = document.getElementById('theme-cluster-border-hex');
    const globalDirectionSelect = document.getElementById('global-direction');
    const subgraphDirectionSelect = document.getElementById('subgraph-direction');

    let draggedNode = null;
    let selectedNode = null;
    let connectionStartNode = null;
    let isConnecting = false;
    const selectedNodeIds = new Set();
    let activeSubgraphId = null;

    const customShapes = [
        { type: 'bang', label: 'Bang' },
        { type: 'notch-rect', label: 'Card' },
        { type: 'cloud', label: 'Cloud' },
        { type: 'hourglass', label: 'Collate' },
        { type: 'bolt', label: 'Com Link' },
        { type: 'brace', label: 'Comment' },
        { type: 'brace-r', label: 'Comment Right' },
        { type: 'braces', label: 'Comment Both' },
        { type: 'lean-r', label: 'Data Input/Output' },
        { type: 'lean-l', label: 'Data Input/Output' },
        { type: 'cyl', label: 'Database' },
        { type: 'diam', label: 'Decision' },
        { type: 'delay', label: 'Delay' },
        { type: 'h-cyl', label: 'Direct Access Storage' },
        { type: 'lin-cyl', label: 'Disk Storage' },
        { type: 'curv-trap', label: 'Display' },
        { type: 'div-rect', label: 'Divided Process' },
        { type: 'doc', label: 'Document' },
        { type: 'rounded', label: 'Event' },
        { type: 'tri', label: 'Extract' },
        { type: 'fork', label: 'Fork/Join' },
        { type: 'win-pane', label: 'Internal Storage' },
        { type: 'f-circ', label: 'Junction' },
        { type: 'lin-doc', label: 'Lined Document' },
        { type: 'lin-rect', label: 'Lined/Shaded Process' },
        { type: 'notch-pent', label: 'Loop Limit' },
        { type: 'flip-tri', label: 'Manual File' },
        { type: 'sl-rect', label: 'Manual Input' },
        { type: 'trap-t', label: 'Manual Operation' },
        { type: 'docs', label: 'Multi-Document' },
        { type: 'st-rect', label: 'Multi-Process' },
        { type: 'odd', label: 'Odd' },
        { type: 'flag', label: 'Paper Tape' },
        { type: 'hex', label: 'Prepare Conditional' },
        { type: 'trap-b', label: 'Priority Action' },
        { type: 'rect', label: 'Process' },
        { type: 'circle', label: 'Start' },
        { type: 'sm-circ', label: 'Start (Small)' },
        { type: 'dbl-circ', label: 'Stop' },
        { type: 'fr-circ', label: 'Stop (Framed)' },
        { type: 'bow-rect', label: 'Stored Data' },
        { type: 'fr-rect', label: 'Subprocess' },
        { type: 'cross-circ', label: 'Summary' },
        { type: 'tag-doc', label: 'Tagged Document' },
        { type: 'tag-rect', label: 'Tagged Process' },
        { type: 'stadium', label: 'Terminal Point' },
        { type: 'text', label: 'Text Block' }
    ];

    themeSelect.value = state.settings?.theme || 'default';
    if (!state.settings.customTheme) {
        state.settings.customTheme = {};
    }

    const fallbackTheme = {
        background: '#ffffff',
        primaryColor: '#ffffff',
        primaryBorderColor: '#333333',
        primaryTextColor: '#333333',
        lineColor: '#333333',
        clusterBkg: '#f5f5f5',
        clusterBorder: '#999999'
    };

    const customThemeFields = [
        { key: 'background', colorInput: themeBackground, hexInput: themeBackgroundHex },
        { key: 'primaryColor', colorInput: themePrimaryColor, hexInput: themePrimaryColorHex },
        { key: 'primaryBorderColor', colorInput: themePrimaryBorderColor, hexInput: themePrimaryBorderColorHex },
        { key: 'primaryTextColor', colorInput: themePrimaryTextColor, hexInput: themePrimaryTextColorHex },
        { key: 'lineColor', colorInput: themeLineColor, hexInput: themeLineColorHex },
        { key: 'clusterBkg', colorInput: themeClusterBg, hexInput: themeClusterBgHex },
        { key: 'clusterBorder', colorInput: themeClusterBorder, hexInput: themeClusterBorderHex }
    ];

    function normalizeHexValue(value) {
        if (!value) return null;
        let normalized = value.trim();
        if (!normalized) return null;
        if (normalized[0] !== '#') {
            normalized = `#${normalized}`;
        }
        const shortMatch = normalized.match(/^#([0-9a-fA-F]{3})$/);
        if (shortMatch) {
            const [r, g, b] = shortMatch[1].split('');
            return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
        }
        const longMatch = normalized.match(/^#([0-9a-fA-F]{6})$/);
        if (longMatch) {
            return `#${longMatch[1]}`.toLowerCase();
        }
        return null;
    }

    function getThemeValue(key) {
        return state.settings.customTheme[key] || fallbackTheme[key];
    }

    function applyThemeToCanvas() {
        const rootStyle = document.documentElement.style;
        const useCustomTheme = themeSelect.value === 'custom';
        const themeVars = [
            { css: '--canvas-bg', key: 'background' },
            { css: '--node-bg', key: 'primaryColor' },
            { css: '--node-border', key: 'primaryBorderColor' },
            { css: '--node-text', key: 'primaryTextColor' },
            { css: '--edge-color', key: 'lineColor' },
            { css: '--edge-label-color', key: 'primaryTextColor' },
            { css: '--edge-label-box-border', key: 'lineColor' },
            { css: '--edge-label-input-border', key: 'lineColor' },
            { css: '--edge-label-input-bg', key: 'background' },
            { css: '--subgraph-bg', key: 'clusterBkg' },
            { css: '--subgraph-border', key: 'clusterBorder' },
            { css: '--subgraph-title-bg', key: 'background' },
            { css: '--subgraph-title-border', key: 'clusterBorder' }
        ];

        themeVars.forEach(({ css, key }) => {
            if (useCustomTheme) {
                rootStyle.setProperty(css, getThemeValue(key));
            } else {
                rootStyle.removeProperty(css);
            }
        });

        updateConnections();
        updateSubgraphs();
    }

    function getEdgeColor() {
        if (themeSelect.value === 'custom') {
            return getThemeValue('lineColor');
        }
        return '#333';
    }

    function setThemeValue(key, value) {
        if (!value) return;
        state.settings.customTheme[key] = value;
        applyThemeToCanvas();
        if (themeSelect.value === 'custom') {
            onUpdate();
        }
    }

    customThemeFields.forEach(({ key, colorInput, hexInput }) => {
        if (!colorInput || !hexInput) return;

        const initialValue = getThemeValue(key);
        colorInput.value = initialValue;
        hexInput.value = initialValue;

        colorInput.addEventListener('input', () => {
            const value = normalizeHexValue(colorInput.value) || colorInput.value;
            colorInput.value = value;
            hexInput.value = value;
            setThemeValue(key, value);
        });

        hexInput.addEventListener('input', () => {
            const normalized = normalizeHexValue(hexInput.value);
            if (!normalized) return;
            hexInput.value = normalized;
            colorInput.value = normalized;
            setThemeValue(key, normalized);
        });

        hexInput.addEventListener('blur', () => {
            const normalized = normalizeHexValue(hexInput.value);
            const fallbackValue = getThemeValue(key);
            if (!normalized) {
                hexInput.value = fallbackValue;
                colorInput.value = fallbackValue;
                return;
            }
            hexInput.value = normalized;
            colorInput.value = normalized;
        });
    });

    globalDirectionSelect.value = state.settings?.direction || 'TD';
    subgraphDirectionSelect.value = 'TD';
    subgraphDirectionSelect.disabled = true;

    function updateCustomThemeVisibility() {
        if (!customThemeSettings) return;
        customThemeSettings.style.display = themeSelect.value === 'custom' ? 'flex' : 'none';
        applyThemeToCanvas();
    }

    updateCustomThemeVisibility();

    themeSelect.addEventListener('change', () => {
        state.settings.theme = themeSelect.value;
        updateCustomThemeVisibility();
        onUpdate();
    });

    globalDirectionSelect.addEventListener('change', () => {
        state.settings.direction = globalDirectionSelect.value;
        onUpdate();
    });

    subgraphDirectionSelect.addEventListener('change', () => {
        if (!activeSubgraphId) return;
        const subgraph = state.subgraphs.find(s => s.id === activeSubgraphId);
        if (!subgraph) return;
        subgraph.direction = subgraphDirectionSelect.value;
        onUpdate();
    });

    // --- Node Creation (Drag from Sidebar) ---
    draggableNodes.forEach(node => {
        node.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('type', node.dataset.type);
            e.dataTransfer.setData('text', node.innerText);
        });
    });

    function buildShapeDropdown() {
        if (!shapeDropdownMenu || !shapeDropdownToggle || !shapeDropdown) return;

        shapeDropdownMenu.innerHTML = '';
        customShapes.forEach(shape => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'shape-menu-item';
            item.dataset.shape = shape.type;
            item.dataset.label = shape.label;

            const icon = document.createElement('span');
            icon.className = 'shape-icon';
            icon.setAttribute('data-shape', shape.type);

            const text = document.createElement('span');
            text.className = 'shape-text';
            text.innerHTML = `${shape.label}<small>${shape.type}</small>`;

            item.appendChild(icon);
            item.appendChild(text);
            shapeDropdownMenu.appendChild(item);
        });

        shapeDropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = shapeDropdown.classList.toggle('open');
            shapeDropdownToggle.setAttribute('aria-expanded', String(isOpen));
            shapeDropdownMenu.setAttribute('aria-hidden', String(!isOpen));
        });

        shapeDropdownMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.shape-menu-item');
            if (!item) return;
            const rect = canvasContainer.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            addNode(item.dataset.shape, item.dataset.label, centerX, centerY);
            shapeDropdown.classList.remove('open');
            shapeDropdownToggle.setAttribute('aria-expanded', 'false');
            shapeDropdownMenu.setAttribute('aria-hidden', 'true');
        });

        document.addEventListener('click', (e) => {
            if (!shapeDropdown.contains(e.target)) {
                shapeDropdown.classList.remove('open');
                shapeDropdownToggle.setAttribute('aria-expanded', 'false');
                shapeDropdownMenu.setAttribute('aria-hidden', 'true');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!shapeDropdown.classList.contains('open')) return;
            shapeDropdown.classList.remove('open');
            shapeDropdownToggle.setAttribute('aria-expanded', 'false');
            shapeDropdownMenu.setAttribute('aria-hidden', 'true');
        });
    }

    buildShapeDropdown();

    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // allow drop
    });

    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type');
        const text = '';
        
        if (type) {
            const rect = canvasContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            addNode(type, text, x, y);
        }
    });

    groupButton.addEventListener('click', () => {
        if (selectedNodeIds.size === 0) return;

        const index = state.subgraphs.length + 1;
        const id = `subgraph${index}`;
        const title = `Subgraph ${index}`;
        const nodeIds = Array.from(selectedNodeIds);

        // Remove selected nodes from any existing subgraph
        state.subgraphs.forEach(subgraph => {
            subgraph.nodeIds = subgraph.nodeIds.filter(nodeId => !selectedNodeIds.has(nodeId));
        });

        state.subgraphs.push({ id, title, nodeIds });
        clearSelection();
        activeSubgraphId = id;
        updateSubgraphs();
        updateSubgraphControls();
        onUpdate();
    });

    addToSubgraphButton.addEventListener('click', () => {
        if (!activeSubgraphId || selectedNodeIds.size === 0) return;
        const subgraph = state.subgraphs.find(s => s.id === activeSubgraphId);
        if (!subgraph) return;

        state.subgraphs.forEach(sg => {
            sg.nodeIds = sg.nodeIds.filter(nodeId => !selectedNodeIds.has(nodeId));
        });

        selectedNodeIds.forEach(nodeId => {
            if (!subgraph.nodeIds.includes(nodeId)) {
                subgraph.nodeIds.push(nodeId);
            }
        });

        updateSubgraphs();
        updateSubgraphControls();
        onUpdate();
    });

    removeFromSubgraphButton.addEventListener('click', () => {
        if (!activeSubgraphId || selectedNodeIds.size === 0) return;
        const subgraph = state.subgraphs.find(s => s.id === activeSubgraphId);
        if (!subgraph) return;

        subgraph.nodeIds = subgraph.nodeIds.filter(nodeId => !selectedNodeIds.has(nodeId));

        if (subgraph.nodeIds.length === 0) {
            state.subgraphs = state.subgraphs.filter(s => s.id !== activeSubgraphId);
            activeSubgraphId = null;
        }

        updateSubgraphs();
        updateSubgraphControls();
        onUpdate();
    });

    resetCanvasButton.addEventListener('click', () => {
        if (state.nodes.length === 0 && state.edges.length === 0 && state.subgraphs.length === 0) {
            return;
        }

        const labelInput = canvasContainer.querySelector('.edge-label-input');
        if (labelInput) labelInput.remove();

        clearSelection();
        activeSubgraphId = null;
        state.nodes = [];
        state.edges = [];
        state.subgraphs = [];

        nodesLayer.innerHTML = '';
        connectionsLayer.innerHTML = '';
        subgraphsLayer.innerHTML = '';

        updateSubgraphControls();
        onUpdate();
    });

    document.addEventListener('keydown', (e) => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelectedNodes();
        }
    });

    // --- State Management ---
    function addNode(type, text, x, y) {
        const index = state.nodes.length + 1;
        const id = 'node' + index;
        const label = (text && text.trim()) ? text.trim() : `Node ${index}`;
        const newNode = { id, type, text: label, x, y };
        state.nodes.push(newNode);

        renderNode(newNode);
        onUpdate();
    }

    function renderNode(nodeData) {
        const nodeEl = document.createElement('div');
        nodeEl.classList.add('node');
        nodeEl.dataset.shape = nodeData.type;
        const labelEl = document.createElement('div');
        labelEl.classList.add('node-label');
        labelEl.innerText = nodeData.text;
        nodeEl.appendChild(labelEl);
        nodeEl.style.left = nodeData.x + 'px';
        nodeEl.style.top = nodeData.y + 'px';
        nodeEl.dataset.id = nodeData.id;

        // Visual tweaks based on type
        if (nodeData.type === 'rounded') nodeEl.style.borderRadius = '20px';
        if (nodeData.type === 'circle') {
            nodeEl.style.borderRadius = '50%';
            nodeEl.style.width = '50px';
            nodeEl.style.height = '50px';
            nodeEl.style.padding = '0';
        }
        if (nodeData.type === 'diamond') {
            nodeEl.style.transform = 'rotate(45deg)';
            labelEl.style.transform = 'rotate(-45deg)';
        }

        // --- Node Interaction (Move & Connect) ---
        nodeEl.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Prevent canvas pan if we add that later

            if (e.shiftKey) {
                // START CONNECTION
                startConnection(nodeData, nodeEl);
            } else {
                // START DRAG
                startDrag(e, nodeData, nodeEl);
            }
        });

        nodeEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            beginNodeLabelEdit(nodeData, labelEl);
        });

        nodeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                toggleSelection(nodeData.id, nodeEl);
            } else {
                setSelection(nodeData.id, nodeEl);
            }
        });

        nodesLayer.appendChild(nodeEl);
    }

    function deleteSelectedNodes() {
        if (selectedNodeIds.size === 0) return;

        const toRemove = new Set(selectedNodeIds);

        state.nodes = state.nodes.filter(node => !toRemove.has(node.id));
        state.edges = state.edges.filter(edge => !toRemove.has(edge.from) && !toRemove.has(edge.to));

        state.subgraphs.forEach(subgraph => {
            subgraph.nodeIds = subgraph.nodeIds.filter(nodeId => !toRemove.has(nodeId));
        });
        state.subgraphs = state.subgraphs.filter(subgraph => subgraph.nodeIds.length > 0);

        if (activeSubgraphId && !state.subgraphs.some(s => s.id === activeSubgraphId)) {
            activeSubgraphId = null;
        }

        toRemove.forEach(nodeId => {
            const nodeEl = document.querySelector(`.node[data-id="${nodeId}"]`);
            if (nodeEl) nodeEl.remove();
        });

        clearSelection();
        updateConnections();
        updateSubgraphs();
        updateSubgraphControls();
        onUpdate();
    }

    // --- Dragging Logic ---
    function startDrag(e, nodeData, nodeEl) {
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = nodeData.x;
        const startTop = nodeData.y;

        function onMouseMove(e) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            nodeData.x = startLeft + dx;
            nodeData.y = startTop + dy;

            nodeEl.style.left = nodeData.x + 'px';
            nodeEl.style.top = nodeData.y + 'px';
            
            updateConnections(); // Redraw lines
            updateSubgraphs();
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            onUpdate(); // Save state
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    // --- Connection Logic (Shift + Click to Drag) ---
    function startConnection(sourceNode, sourceEl) {
        isConnecting = true;
        connectionStartNode = sourceNode;

        // Create a temporary line
        const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempLine.setAttribute('stroke', getEdgeColor());
        tempLine.setAttribute('stroke-width', '2');
        connectionsLayer.appendChild(tempLine);

        function updateTempLine(e) {
            const rect = canvasContainer.getBoundingClientRect();
            const x1 = sourceNode.x + sourceEl.offsetWidth / 2;
            const y1 = sourceNode.y + sourceEl.offsetHeight / 2;
            const x2 = e.clientX - rect.left;
            const y2 = e.clientY - rect.top;

            tempLine.setAttribute('x1', x1);
            tempLine.setAttribute('y1', y1);
            tempLine.setAttribute('x2', x2);
            tempLine.setAttribute('y2', y2);
        }

        function finishConnection(e) {
            isConnecting = false;
            document.removeEventListener('mousemove', updateTempLine);
            document.removeEventListener('mouseup', finishConnection);
            
            // Allow clicking on a target node
            const targetEl = document.elementFromPoint(e.clientX, e.clientY);
            const targetNodeEl = targetEl.closest('.node');
            
            if (targetNodeEl) {
                const targetId = targetNodeEl.dataset.id;
                // No self-loops for simplicity in MVP, check ID
                if (targetId && targetId !== sourceNode.id) {
                     // Add connection to state
                     state.edges.push({ from: sourceNode.id, to: targetId, label: '' });
                     onUpdate();
                }
            }
            
            tempLine.remove();
            updateConnections(); // Draw real lines
        }

        document.addEventListener('mousemove', updateTempLine);
        document.addEventListener('mouseup', finishConnection);
    }

    function updateConnections() {
        // Clear existing lines but keep defs if we want, or just rebuild everything
        connectionsLayer.innerHTML = '';
        
        // Re-add marker definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                const edgeColor = getEdgeColor();
                defs.innerHTML = `
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="${edgeColor}" />
                        </marker>
                `;
        connectionsLayer.appendChild(defs);

        state.edges.forEach(edge => {
            const fromNode = state.nodes.find(n => n.id === edge.from);
            const toNode = state.nodes.find(n => n.id === edge.to);

            if (fromNode && toNode) {
                // Find visible centers (simplified)
                // In a real app, we'd calculate intersection points with the node border
                // For MVP, just center-to-center or approximate
                
                // We need DOM elements to get width/height accurately if dynamic
                // But for now, let's assume a standard size or read from DOM if possible
                // Better: Update state with width/height on render? 
                // Let's just re-query for now (inefficient but explicit)
                
                const fromEl = document.querySelector(`.node[data-id="${edge.from}"]`);
                const toEl = document.querySelector(`.node[data-id="${edge.to}"]`);

                if (fromEl && toEl) {
                     const x1 = fromNode.x + fromEl.offsetWidth / 2;
                     const y1 = fromNode.y + fromEl.offsetHeight / 2;
                     const x2 = toNode.x + toEl.offsetWidth / 2;
                     const y2 = toNode.y + toEl.offsetHeight / 2;
                     const midX = (x1 + x2) / 2;
                     const midY = (y1 + y2) / 2;

                     const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                     line.setAttribute('x1', x1);
                     line.setAttribute('y1', y1);
                     line.setAttribute('x2', x2);
                     line.setAttribute('y2', y2);
                     line.setAttribute('stroke', edgeColor);
                     line.setAttribute('stroke-width', '2');
                     line.setAttribute('marker-end', 'url(#arrowhead)'); // We need to define this marker
                     line.addEventListener('click', (e) => {
                         e.stopPropagation();
                         if (!(e.ctrlKey || e.metaKey)) return;
                         beginEdgeLabelEdit(edge, midX, midY);
                     });
                     
                     connectionsLayer.appendChild(line);

                     if (edge.label && edge.label.trim()) {
                         const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                         textEl.setAttribute('x', midX);
                         textEl.setAttribute('y', midY - 6);
                         textEl.setAttribute('text-anchor', 'middle');
                         textEl.classList.add('edge-label');
                         textEl.textContent = edge.label;
                         textEl.addEventListener('click', (e) => {
                             e.stopPropagation();
                             if (!(e.ctrlKey || e.metaKey)) return;
                             beginEdgeLabelEdit(edge, midX, midY);
                         });
                         connectionsLayer.appendChild(textEl);
                     } else {
                         const labelBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                         labelBox.setAttribute('x', midX - 28);
                         labelBox.setAttribute('y', midY - 12);
                         labelBox.setAttribute('width', '56');
                         labelBox.setAttribute('height', '20');
                         labelBox.setAttribute('pointer-events', 'all');
                         labelBox.classList.add('edge-label-box');
                         labelBox.addEventListener('click', (e) => {
                             e.stopPropagation();
                             if (!(e.ctrlKey || e.metaKey)) return;
                             beginEdgeLabelEdit(edge, midX, midY);
                         });
                         connectionsLayer.appendChild(labelBox);
                     }
                }
            }
        });

        updateSubgraphs();
        
        // Ensure arrowhead definition exists
                if (!document.getElementById('svg-defs')) {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.id = 'svg-defs';
            defs.innerHTML = `
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="10" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="${edgeColor}" />
                </marker>
            `;
            connectionsLayer.appendChild(defs);
        }
    }

    function updateSubgraphs() {
        subgraphsLayer.innerHTML = '';

        state.subgraphs.forEach(subgraph => {
            const bounds = getSubgraphBounds(subgraph.nodeIds);
            if (!bounds) return;

            const box = document.createElement('div');
            box.className = 'subgraph-box';
            if (subgraph.id === activeSubgraphId) {
                box.classList.add('active');
            }
            box.style.left = `${bounds.x}px`;
            box.style.top = `${bounds.y}px`;
            box.style.width = `${bounds.width}px`;
            box.style.height = `${bounds.height}px`;

            const title = document.createElement('div');
            title.className = 'subgraph-title';
            if (subgraph.id === activeSubgraphId) {
                title.classList.add('active');
            }
            title.style.left = `${bounds.x + 10}px`;
            title.style.top = `${bounds.y - 12}px`;

            const titleText = document.createElement('span');
            titleText.className = 'subgraph-title-text';
            titleText.innerText = subgraph.title || 'Subgraph';
            title.appendChild(titleText);

            const editIcon = document.createElement('span');
            editIcon.className = 'subgraph-edit-icon';
            title.appendChild(editIcon);
            title.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                    beginSubgraphTitleEdit(subgraph, title, titleText);
                    return;
                }
                activeSubgraphId = (activeSubgraphId === subgraph.id) ? null : subgraph.id;
                updateSubgraphs();
                updateSubgraphControls();
            });

            subgraphsLayer.appendChild(box);
            subgraphsLayer.appendChild(title);
        });
    }

    function getSubgraphBounds(nodeIds) {
        const padding = 20;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        nodeIds.forEach(nodeId => {
            const node = state.nodes.find(n => n.id === nodeId);
            const nodeEl = document.querySelector(`.node[data-id="${nodeId}"]`);
            if (!node || !nodeEl) return;

            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + nodeEl.offsetWidth);
            maxY = Math.max(maxY, node.y + nodeEl.offsetHeight);
        });

        if (!isFinite(minX)) return null;

        return {
            x: minX - padding,
            y: minY - padding,
            width: (maxX - minX) + padding * 2,
            height: (maxY - minY) + padding * 2
        };
    }

    function setSelection(nodeId, nodeEl) {
        clearSelection();
        selectedNodeIds.add(nodeId);
        nodeEl.classList.add('selected');
        updateSubgraphControls();
    }

    function toggleSelection(nodeId, nodeEl) {
        if (selectedNodeIds.has(nodeId)) {
            selectedNodeIds.delete(nodeId);
            nodeEl.classList.remove('selected');
        } else {
            selectedNodeIds.add(nodeId);
            nodeEl.classList.add('selected');
        }
        updateSubgraphControls();
    }

    function clearSelection() {
        selectedNodeIds.forEach(nodeId => {
            const nodeEl = document.querySelector(`.node[data-id="${nodeId}"]`);
            if (nodeEl) nodeEl.classList.remove('selected');
        });
        selectedNodeIds.clear();
        updateSubgraphControls();
    }

    function updateSubgraphControls() {
        const hasActive = Boolean(activeSubgraphId);
        const hasSelection = selectedNodeIds.size > 0;
        addToSubgraphButton.disabled = !(hasActive && hasSelection);
        removeFromSubgraphButton.disabled = !(hasActive && hasSelection);
        subgraphDirectionSelect.disabled = !hasActive;
        if (hasActive) {
            const subgraph = state.subgraphs.find(s => s.id === activeSubgraphId);
            subgraphDirectionSelect.value = subgraph?.direction || 'TD';
        }
    }

    function beginNodeLabelEdit(nodeData, labelEl) {
        if (labelEl.isContentEditable) return;

        const originalText = nodeData.text;
        labelEl.contentEditable = 'true';
        labelEl.classList.add('editing');
        labelEl.focus();

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(labelEl);
        selection.removeAllRanges();
        selection.addRange(range);

        function finishEdit(shouldSave) {
            labelEl.contentEditable = 'false';
            labelEl.classList.remove('editing');

            if (shouldSave) {
                const newText = labelEl.innerText.trim() || 'Node';
                nodeData.text = newText;
                labelEl.innerText = newText;
            } else {
                labelEl.innerText = originalText;
            }

            labelEl.removeEventListener('blur', onBlur);
            labelEl.removeEventListener('keydown', onKeyDown);
            onUpdate();
        }

        function onBlur() {
            finishEdit(true);
        }

        function onKeyDown(e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                finishEdit(true);
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                finishEdit(false);
            }
        }

        labelEl.addEventListener('blur', onBlur);
        labelEl.addEventListener('keydown', onKeyDown);
    }

    function beginSubgraphTitleEdit(subgraph, titleEl, textEl) {
        if (textEl.isContentEditable) return;

        const originalText = subgraph.title || '';
        textEl.contentEditable = 'true';
        titleEl.classList.add('editing');
        textEl.focus();

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(textEl);
        selection.removeAllRanges();
        selection.addRange(range);

        function finishEdit(shouldSave) {
            textEl.contentEditable = 'false';
            titleEl.classList.remove('editing');

            if (shouldSave) {
                const newText = textEl.innerText.trim() || 'Subgraph';
                subgraph.title = newText;
                textEl.innerText = newText;
            } else {
                textEl.innerText = originalText;
            }

            textEl.removeEventListener('blur', onBlur);
            textEl.removeEventListener('keydown', onKeyDown);
            onUpdate();
        }

        function onBlur() {
            finishEdit(true);
        }

        function onKeyDown(e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                finishEdit(true);
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                finishEdit(false);
            }
        }

        textEl.addEventListener('blur', onBlur);
        textEl.addEventListener('keydown', onKeyDown);
    }

    function beginEdgeLabelEdit(edge, x, y) {
        const existing = canvasContainer.querySelector('.edge-label-input');
        if (existing) existing.remove();

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edge-label-input';
        input.value = edge.label || '';
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;

        canvasContainer.appendChild(input);
        input.focus();
        input.select();

        function finishEdit(shouldSave) {
            if (!input.isConnected) return;
            if (shouldSave) {
                edge.label = input.value.trim();
            }
            input.remove();
            onUpdate();
            updateConnections();
        }

        input.addEventListener('blur', () => finishEdit(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEdit(true);
            }
            if (e.key === 'Escape') {
                finishEdit(false);
            }
        });
    }
}
