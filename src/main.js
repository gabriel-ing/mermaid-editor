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
const downloadStatus = document.getElementById('download-status');

function setDownloadStatus(message) {
    if (!downloadStatus) return;
    downloadStatus.textContent = message;
}

function updatePreview() {
    const code = generateCode(state);
    const codeElement = document.getElementById('mermaid-code');
    const previewElement = document.getElementById('mermaid-preview');
    const theme = state.settings?.theme || 'default';

    codeElement.value = code;
    previewElement.innerHTML = code;
    
    // Rerender mermaid diagram
    mermaid.initialize({ startOnLoad: false, theme, flowchart: { htmlLabels: false } });
    mermaid.render('mermaid-preview-svg', code).then((svgCode) => {
        const styledSvg = inlineSvgTextStyles(svgCode.svg);
        lastRenderedSvg = styledSvg;
        previewElement.innerHTML = styledSvg;
        if (downloadButton) {
            downloadButton.disabled = false;
        }
        setDownloadStatus('');
    }).catch(() => {
        if (downloadButton) {
            downloadButton.disabled = true;
        }
        setDownloadStatus('Preview render failed.');
    });
}

async function getExportSvg(theme) {
    const code = generateCode(state);
    mermaid.initialize({
        startOnLoad: false,
        theme,
        securityLevel: 'strict',
        flowchart: { htmlLabels: false }
    });
    const svgCode = await mermaid.render('mermaid-export-svg', code);
    return svgCode.svg;
}

function sanitizeSvgText(svgText) {
    return svgText
        .replace(/@import[^;]+;/g, '')
        .replace(/url\((['"]?)https?:[^)]+\1\)/g, '');
}

function inlineSvgTextStyles(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgNs = 'http://www.w3.org/2000/svg';

    const foreignObjects = Array.from(doc.querySelectorAll('foreignObject'));
    foreignObjects.forEach(foreignObject => {
        const parent = foreignObject.parentNode;
        if (!parent) return;

        const textValue = (foreignObject.textContent || '').replace(/\s+/g, ' ').trim();
        if (!textValue) {
            foreignObject.remove();
            return;
        }

        const width = parseFloat(foreignObject.getAttribute('width')) || 0;
        const height = parseFloat(foreignObject.getAttribute('height')) || 0;
        const textEl = doc.createElementNS(svgNs, 'text');
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('dominant-baseline', 'middle');

        const fontSize = 14;
        const lineHeight = Math.round(fontSize * 1.2);
        const lines = textValue.split(/\n/).map(line => line.trim()).filter(Boolean);

        if (lines.length <= 1) {
            textEl.setAttribute('x', `${width / 2}`);
            textEl.setAttribute('y', `${height / 2}`);
            textEl.textContent = lines[0] || textValue;
        } else {
            const startY = (height / 2) - ((lines.length - 1) * lineHeight) / 2;
            lines.forEach((line, index) => {
                const tspan = doc.createElementNS(svgNs, 'tspan');
                tspan.setAttribute('x', `${width / 2}`);
                tspan.setAttribute('y', `${startY + index * lineHeight}`);
                tspan.textContent = line;
                textEl.appendChild(tspan);
            });
        }

        parent.insertBefore(textEl, foreignObject);
        foreignObject.remove();
    });

    const textNodes = doc.querySelectorAll('text, tspan');
    textNodes.forEach(node => {
        if (!node.getAttribute('fill')) {
            node.setAttribute('fill', '#333');
        }
        if (!node.getAttribute('font-family')) {
            node.setAttribute('font-family', 'Arial, sans-serif');
        }
        if (!node.getAttribute('font-size')) {
            node.setAttribute('font-size', '14');
        }
    });

    return new XMLSerializer().serializeToString(doc);
}

function downloadSvg(svgText) {
    const sanitized = sanitizeSvgText(svgText);
    const styled = inlineSvgTextStyles(sanitized);
    const svgBlob = new Blob([styled], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = svgUrl;
    link.download = 'diagram.svg';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(svgUrl);
}

async function downloadPng(scale) {
    const theme = state.settings?.theme || 'default';
    let svgText = '';

    try {
        svgText = await getExportSvg(theme);
    } catch (error) {
        svgText = lastRenderedSvg;
    }

    if (!svgText) return;

    svgText = sanitizeSvgText(svgText);
    svgText = inlineSvgTextStyles(svgText);

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return;

    if (!svgEl.getAttribute('xmlns')) {
        svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

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
    img.crossOrigin = 'anonymous';
    img.onerror = () => {
        setDownloadStatus('Failed to load SVG for export.');
        URL.revokeObjectURL(url);
    };
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, finalWidth, finalHeight);
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        try {
            canvas.toBlob((blob) => {
                if (blob) {
                    const pngUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = pngUrl;
                    link.download = 'diagram.png';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(pngUrl);
                    setDownloadStatus('PNG downloaded.');
                    return;
                }

                const dataUrl = canvas.toDataURL('image/png');
                const fallbackLink = document.createElement('a');
                fallbackLink.href = dataUrl;
                fallbackLink.download = 'diagram.png';
                document.body.appendChild(fallbackLink);
                fallbackLink.click();
                fallbackLink.remove();
                setDownloadStatus('PNG downloaded.');
            }, 'image/png');
        } catch (error) {
            setDownloadStatus('PNG blocked by browser. Downloading SVG instead.');
            downloadSvg(serialized);
        }

        URL.revokeObjectURL(url);
    };
    img.src = url;

    mermaid.initialize({ startOnLoad: false, theme, flowchart: { htmlLabels: false } });
}

if (downloadButton && sizeSelect) {
    downloadButton.addEventListener('click', async () => {
        const scale = parseFloat(sizeSelect.value) || 1;
        setDownloadStatus('Preparing PNG...');
        await downloadPng(scale);
    });
}

// Initialize canvas with a callback to update state
initCanvas(state, updatePreview);
updatePreview();
