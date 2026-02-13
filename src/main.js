// Main application entry point

import { initCanvas } from './canvas.js';
import { generateCode } from './generator.js';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({ startOnLoad: true, theme: 'default' });

const state = {
    nodes: [],
    edges: [],
    subgraphs: [],
    settings: {
        theme: 'default',
        direction: 'TD'
    }
};

let lastRenderedSvg = '';
const downloadButton = document.getElementById('download-png');
const sizeSelect = document.getElementById('png-size');

function updatePreview() {
    const code = generateCode(state);
    const codeElement = document.getElementById('mermaid-code');
    const previewElement = document.getElementById('mermaid-preview');
    const theme = state.settings?.theme || 'default';

    codeElement.value = code;
    previewElement.innerHTML = code;
    
    // Rerender mermaid diagram
    mermaid.initialize({ startOnLoad: false, theme });
    mermaid.render('mermaid-preview-svg', code).then((svgCode) => {
        lastRenderedSvg = svgCode.svg;
        previewElement.innerHTML = svgCode.svg;
    });
}

function downloadPng(scale) {
    if (!lastRenderedSvg) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(lastRenderedSvg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return;

    const viewBox = svgEl.getAttribute('viewBox');
    let width = parseFloat(svgEl.getAttribute('width')) || 0;
    let height = parseFloat(svgEl.getAttribute('height')) || 0;

    if ((!width || !height) && viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        width = parts[2];
        height = parts[3];
    }

    if (!width || !height) {
        width = 800;
        height = 600;
        svgEl.setAttribute('width', `${width}`);
        svgEl.setAttribute('height', `${height}`);
    }

    const finalWidth = Math.round(width * scale);
    const finalHeight = Math.round(height * scale);

    const serialized = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, finalWidth, finalHeight);
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = 'diagram.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(pngUrl);
        }, 'image/png');

        URL.revokeObjectURL(url);
    };
    img.src = url;
}

downloadButton.addEventListener('click', () => {
    const scale = parseFloat(sizeSelect.value) || 1;
    downloadPng(scale);
});

// Initialize canvas with a callback to update state
initCanvas(state, updatePreview);
updatePreview();
