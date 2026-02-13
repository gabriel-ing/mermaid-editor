// Generates Mermaid code from the state

export function generateCode(state) {
    const direction = (state.settings && state.settings.direction) ? state.settings.direction : 'TD';
    let code = `graph ${direction}\n`;

    const subgraphByNode = new Map();
    (state.subgraphs || []).forEach(subgraph => {
        subgraph.nodeIds.forEach(nodeId => subgraphByNode.set(nodeId, subgraph.id));
    });

    function formatNode(node, indent) {
        let shapeStart = '[';
        let shapeEnd = ']';

        if (node.type === 'rounded') {
            shapeStart = '(';
            shapeEnd = ')';
        } else if (node.type === 'diamond') {
            shapeStart = '{';
            shapeEnd = '}';
        } else if (node.type === 'circle') {
            shapeStart = '((';
            shapeEnd = '))';
        }

        const label = (node.text || '').replace(/\n/g, '<br/>');
        return `${indent}${node.id}${shapeStart}"${label}"${shapeEnd}\n`;
    }

    // Add nodes
    (state.subgraphs || []).forEach(subgraph => {
        const title = (subgraph.title || '').replace(/\n/g, '<br/>');
        code += `    subgraph ${subgraph.id}["${title}"]\n`;
        if (subgraph.direction) {
            code += `        direction ${subgraph.direction}\n`;
        }
        subgraph.nodeIds.forEach(nodeId => {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                code += formatNode(node, '        ');
            }
        });
        code += '    end\n';
    });

    state.nodes.forEach(node => {
        if (!subgraphByNode.has(node.id)) {
            code += formatNode(node, '    ');
        }
    });

    // Add edges
    state.edges.forEach(edge => {
        const label = (edge.label || '').trim();
        if (label.length > 0) {
            code += `    ${edge.from} -- ${label} --> ${edge.to}\n`;
        } else {
            code += `    ${edge.from} --> ${edge.to}\n`;
        }
    });

    return code;
}
