self.onmessage = async function(e) {
    const { file, id, maxWidth } = e.data;
    
    try {
        const improvedBytes = await improveImage(file, maxWidth);
        self.postMessage({ id, improvedBytes, success: true });
    } catch (error) {
        self.postMessage({ id, success: false, error: error.message });
    }
};

async function improveImage(file, maxWidth = 2000) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            
            // Escalado inteligente
            let { width, height } = img;
            if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = Math.round(height * ratio);
            }
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, width, height);

            let data = ctx.getImageData(0, 0, width, height);

            // === TU ALGORITMO ORIGINAL DE MEJORA ===
            // 1. Escala de grises
            for (let i = 0; i < data.data.length; i += 4) {
                const gray = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
                data.data[i] = data.data[i + 1] = data.data[i + 2] = gray;
            }

            // 2. Mejora de contraste suave
            let min = 255, max = 0;
            for (let i = 0; i < data.data.length; i += 4) {
                const v = data.data[i];
                if (v < min) min = v;
                if (v > max) max = v;
            }
            const range = max - min || 1;
            for (let i = 0; i < data.data.length; i += 4) {
                let v = ((data.data[i] - min) * 240) / range + 10;
                data.data[i] = data.data[i + 1] = data.data[i + 2] = Math.round(v);
            }

            // 3. Oscurecer selectivo (texto)
            for (let i = 0; i < data.data.length; i += 4) {
                let v = data.data[i];
                if (v > 90 && v < 210) v = Math.round(v * 0.58);
                data.data[i] = data.data[i + 1] = data.data[i + 2] = Math.max(20, v);
            }

            // 4. Realce de bordes ligero
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
                    let val = copy[i] + diff * 1.6;
                    data.data[i] = data.data[i + 1] = data.data[i + 2] = Math.max(0, Math.min(255, Math.round(val)));
                }
            }

            ctx.putImageData(data, 0, 0);

            canvas.toBlob(blob => {
                blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
            }, 'image/jpeg', 0.92);
        };
        img.src = URL.createObjectURL(file);
    });
}