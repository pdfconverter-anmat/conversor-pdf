const pdfInput = document.getElementById('pdfInput');
        const fileList = document.getElementById('fileList');
        const generateZipButton = document.getElementById('generateZipButton');
        const progressContainer = document.getElementById('progressContainer');
        const progressText = document.getElementById('progressText');

        let selectedFiles = [];
        let progressBar = null;

        function parseFileName(filename) {
            const nameWithoutExt = filename.replace(/\.(pdf|PDF)$/i, '');
            const regex = /^(\d+)\s+(\d+)\s+(.+?)\s*-\s*(.+?)\s*-\s*(.+?)$/i;
            const match = nameWithoutExt.match(regex);
            
            if (!match) return null;

            const toKey = str => str.trim().replace(/\s+/g, '_');

            const dispo   = match[1].trim();
            const anio    = match[2].trim();
            const empresa = toKey(match[3]);
            const tramite = toKey(match[4]);
            const familia = toKey(match[5]);

            const newName = `${dispo}-${anio}-${empresa}-${tramite}-${familia}.pdf`;
            return { oldName: filename, newName: newName };
        }

        pdfInput.addEventListener('change', function(event) {
            fileList.innerHTML = '';
            selectedFiles = [];
            generateZipButton.disabled = true;

            const files = Array.from(event.target.files);

            files.forEach((file, index) => {
                const parsed = parseFileName(file.name);
                const item = document.createElement('div');
                item.className = 'list-group-item';

                if (parsed) {
                    item.innerHTML = `<strong class="text-success">${parsed.newName}</strong>`;
                    selectedFiles.push({file, parsed});
                } else {
                    item.innerHTML = `
                        <strong>${file.name}</strong><br>
                        <small class="text-danger">No coincide con el formato esperado</small>
                    `;
                }
                fileList.appendChild(item);
            });

            if (selectedFiles.length > 0) {
                generateZipButton.disabled = false;
            }
        });

        // Inicializar barra de progreso
        function initProgressBar() {
            if (progressBar) progressBar.destroy();
            progressContainer.style.display = 'block';
            
            progressBar = new ProgressBar.Line('#progressBar', {
                strokeWidth: 4,
                easing: 'easeInOut',
                duration: 1400,
                color: '#0dcaf0',
                trailColor: '#2c3e50',
                trailWidth: 4,
                svgStyle: {width: '100%', height: '100%'}
            });
        }

        // Generar ZIP
        generateZipButton.addEventListener('click', async function() {
            if (selectedFiles.length === 0) return;

            initProgressBar();
            generateZipButton.disabled = true;
            const zip = new JSZip();

            for (let i = 0; i < selectedFiles.length; i++) {
                const {file, parsed} = selectedFiles[i];
                
                // Leer el archivo y agregarlo al ZIP con el nuevo nombre
                const arrayBuffer = await file.arrayBuffer();
                zip.file(parsed.newName, arrayBuffer);

                // Actualizar progreso
                const progress = (i + 1) / selectedFiles.length;
                progressBar.animate(progress);
                progressText.textContent = `${Math.round(progress * 100)}%`;
            }

            // Generar y descargar el ZIP
            const zipBlob = await zip.generateAsync({type: "blob"});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `PDFs_Renombrados_${new Date().toISOString().slice(0,10)}.zip`;
            link.click();

            // Finalizar
            setTimeout(() => {
                alert(`¡ZIP generado correctamente con ${selectedFiles.length} archivos!`);
                progressContainer.style.display = 'none';
                generateZipButton.disabled = false;
            }, 500);
        });