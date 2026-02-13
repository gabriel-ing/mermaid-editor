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
    const themeSelect = document.getElementById('theme-select');
    const globalDirectionSelect = document.getElementById('global-direction');
    const subgraphDirectionSelect = document.getElementById('subgraph-direction');

    let draggedNode = null;
    let selectedNode = null;
    let connectionStartNode = null;
    let isConnecting = false;
    const selectedNodeIds = new Set();
    let activeSubgraphId = null;

    themeSelect.value = state.settings?.theme || 'default';
    globalDirectionSelect.value = state.settings?.direction || 'TD';
    subgraphDirectionSelect.value = 'TD';
    subgraphDirectionSelect.disabled = true;

    themeSelect.addEventListener('change', () => {
        state.settings.theme = themeSelect.value;
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
        tempLine.setAttribute('stroke', '#333');
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
        defs.innerHTML = `
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
            refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
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
                     line.setAttribute('stroke', '#333');
                     line.setAttribute('stroke-width', '2');
                     line.setAttribute('marker-end', 'url(#arrowhead)'); // We need to define this marker
                     line.addEventListener('click', (e) => {
                         e.stopPropagation();
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
                             beginEdgeLabelEdit(edge, midX, midY);
                         });
                         connectionsLayer.appendChild(textEl);
                     } else {
                         const labelBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                         labelBox.setAttribute('x', midX - 28);
                         labelBox.setAttribute('y', midY - 12);
                         labelBox.setAttribute('width', '56');
                         labelBox.setAttribute('height', '20');
                         labelBox.classList.add('edge-label-box');
                         labelBox.addEventListener('click', (e) => {
                             e.stopPropagation();
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
                  <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
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
            title.innerText = subgraph.title || 'Subgraph';
            const editIcon = document.createElement('span');
            editIcon.className = 'subgraph-edit-icon';
            title.appendChild(editIcon);
            title.addEventListener('click', (e) => {
                e.stopPropagation();
                activeSubgraphId = (activeSubgraphId === subgraph.id) ? null : subgraph.id;
                updateSubgraphs();
                updateSubgraphControls();
            });
            title.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                beginSubgraphTitleEdit(subgraph, title);
            });

            box.appendChild(title);
            subgraphsLayer.appendChild(box);
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

    function beginSubgraphTitleEdit(subgraph, titleEl) {
        if (titleEl.isContentEditable) return;

        const originalText = subgraph.title || '';
        titleEl.contentEditable = 'true';
        titleEl.classList.add('editing');
        titleEl.focus();

        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        selection.removeAllRanges();
        selection.addRange(range);

        function finishEdit(shouldSave) {
            titleEl.contentEditable = 'false';
            titleEl.classList.remove('editing');

            if (shouldSave) {
                const newText = titleEl.innerText.trim() || 'Subgraph';
                subgraph.title = newText;
                titleEl.innerText = newText;
            } else {
                titleEl.innerText = originalText;
            }

            titleEl.removeEventListener('blur', onBlur);
            titleEl.removeEventListener('keydown', onKeyDown);
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

        titleEl.addEventListener('blur', onBlur);
        titleEl.addEventListener('keydown', onKeyDown);
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
