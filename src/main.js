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
    mermaid.initialize({ startOnLoad: false, theme, flowchart: { htmlLabels: true } });
    mermaid.render('mermaid-preview-svg', code).then((svgCode) => {
        lastRenderedSvg = svgCode.svg;
        previewElement.innerHTML = svgCode.svg;
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

function downloadSvg(svgText) {
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
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

    mermaid.initialize({ startOnLoad: false, theme, flowchart: { htmlLabels: true } });
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
