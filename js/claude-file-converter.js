// ==================== CONFIGURACIÓN ====================
const MAX_IMAGE_WIDTH = 2200;
let selectedFiles = [];

// ==================== MEJORA DE IMAGEN (En hilo principal) ====================
async function improveImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > MAX_IMAGE_WIDTH) {
                const ratio = MAX_IMAGE_WIDTH / width;
                width = MAX_IMAGE_WIDTH;
                height = Math.round(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            let data = ctx.getImageData(0, 0, width, height);

            // === ALGORITMO MEJORADO ===
            // 1. Escala de grises
            for (let i = 0; i < data.data.length; i += 4) {
                const gray = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
                data.data[i] = data.data[i + 1] = data.data[i + 2] = gray;
            }

            // 2. Contraste fuerte + brillo
            let min = 255, max = 0;
            for (let i = 0; i < data.data.length; i += 4) {
                const v = data.data[i];
                if (v < min) min = v;
                if (v > max) max = v;
            }
            const range = max - min || 1;
            for (let i = 0; i < data.data.length; i += 4) {
                let v = ((data.data[i] - min) * 260) / range + 8;   // más contraste
                data.data[i] = data.data[i + 1] = data.data[i + 2] = Math.round(v);
            }

            // 3. Oscurecer texto + aclarar fondo
            for (let i = 0; i < data.data.length; i += 4) {
                let v = data.data[i];
                if (v > 80 && v < 220) v = Math.round(v * 0.52);      // texto más negro
                data.data[i] = data.data[i + 1] = data.data[i + 2] = Math.max(15, v);
            }

            // 4. Sharpness (Unsharp Mask) - Muy importante para documentos
            const copy = new Uint8ClampedArray(data.data);
            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                    const i = (y * canvas.width + x) * 4;
                    let sum = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            sum += copy[((y + dy) * canvas.width + (x + dx)) * 4];
                        }
                    }
                    const avg = sum / 9;
                    const diff = copy[i] - avg;
                    let val = copy[i] + diff * 2.2;                    // más nitidez
                    data.data[i] = data.data[i + 1] = data.data[i + 2] = 
                        Math.max(0, Math.min(255, Math.round(val)));
                }
            }

            ctx.putImageData(data, 0, 0);

            canvas.toBlob(blob => {
                blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
            }, 'image/jpeg', 0.93);
        };

        img.onerror = () => reject(new Error("Error cargando imagen"));
        img.src = URL.createObjectURL(file);
    });
}

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const selectedFilesBody = document.getElementById('selectedFilesBody');
    const convertButton = document.getElementById('convertButton');
    const processingStatus = document.getElementById('processingStatus');

    fileInput.addEventListener('change', async function (event) {
        selectedFiles = [];
        selectedFilesBody.innerHTML = '';
        convertButton.disabled = true;
        processingStatus.style.display = 'block';

        const files = Array.from(event.target.files);

        for (const file of files) {
            const parsed = parseFileName(file.name);
            if (!parsed) continue;

            try {
                const improvedBytes = await improveImage(file);

                selectedFiles.push({
                    file,
                    dispositionNumber: parsed.dispositionNumber,
                    improvedBytes
                });

                const row = document.createElement('div');
                row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 3px 4px; border-bottom: 1px solid #2a2a2a;';
                row.innerHTML = `
                    <span style="flex: 2;">${file.name}</span>
                    <span style="flex: 1;">${parsed.dispositionNumber}</span>
                    <button class="btn btn-sm btn-danger" onclick="removeFile('${file.name}')">Eliminar</button>
                `;
                selectedFilesBody.appendChild(row);

            } catch (err) {
                console.error(`Error procesando ${file.name}:`, err);
            }
        }

        processingStatus.style.display = 'none';
        convertButton.disabled = selectedFiles.length === 0;
    });

    convertButton.addEventListener('click', convertToPDF);
});

// ==================== AUXILIARES ====================
function parseFileName(filename) {
    const regex = /^(\d+)\s+(\d+)\s+([^-]+)\s*-\s*([^-]+)\s*-\s*([^.]+)\.jpg$/i;
    const match = filename.match(regex);
    if (!match) return null;
    return { dispositionNumber: match[1] };
}

function removeFile(filename) {
    selectedFiles = selectedFiles.filter(f => f.file.name !== filename);
    const tbody = document.getElementById('selectedFilesBody');
    tbody.innerHTML = '';

    selectedFiles.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 3px 4px; border-bottom: 1px solid #2a2a2a;';
        row.innerHTML = `
            <span style="flex: 2;">${item.file.name}</span>
            <span style="flex: 1;">${item.dispositionNumber}</span>
            <button class="btn btn-sm btn-danger" onclick="removeFile('${item.file.name}')">Eliminar</button>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('convertButton').disabled = selectedFiles.length === 0;
}

async function convertToPDF() {
    if (selectedFiles.length === 0) return;

    const grouped = selectedFiles.reduce((acc, item) => {
        const key = item.dispositionNumber;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const total = Object.keys(grouped).length;

    for (const key in grouped) {
        const group = grouped[key];
        const pdfDoc = await PDFLib.PDFDocument.create();
        const baseName = group[0].file.name.replace(/\.jpg$/i, '');

        group.sort((a, b) => a.file.name.localeCompare(b.file.name));

        for (const item of group) {
            const image = await pdfDoc.embedJpg(item.improvedBytes);
            let { width, height } = image;
            if (width > MAX_IMAGE_WIDTH) {
                const ratio = MAX_IMAGE_WIDTH / width;
                width = MAX_IMAGE_WIDTH;
                height = Math.round(height * ratio);
            }
            const page = pdfDoc.addPage([width, height]);
            page.drawImage(image, { x: 0, y: 0, width, height });
        }

        const pdfBytes = await pdfDoc.save({ useObjectStreams: true, compress: true });
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${baseName}.pdf`;
        link.click();
    }

    alert(`¡Conversión completada! Se generaron ${total} archivo(s) PDF.`);
}