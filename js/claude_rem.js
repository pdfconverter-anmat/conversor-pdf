const imageInput = document.getElementById('imageInput');
const fileList = document.getElementById('fileList');
const mainPreviewImage = document.getElementById('mainPreviewImage');
const newFileNameInput = document.getElementById('newFileNameInput');
const saveButton = document.getElementById('saveButton');

let selectedFiles = [];
let currentSelectedIndex = -1;

imageInput.addEventListener('change', function(event) {
    // Limpiar estados anteriores
    fileList.innerHTML = '';
    mainPreviewImage.style.display = 'none';
    selectedFiles = Array.from(event.target.files);
    currentSelectedIndex = -1;
    saveButton.disabled = true;
    newFileNameInput.value = '';

    // Crear lista de archivos
    selectedFiles.forEach((file, index) => {
        const fileListItem = document.createElement('div');
        fileListItem.classList.add('file-list-item', 'list-group-item', 'list-group-item-action');
        fileListItem.textContent = file.name;
        
        fileListItem.addEventListener('click', () => {
            // Desactivar todos los elementos
            document.querySelectorAll('.file-list-item').forEach(item => 
                item.classList.remove('active')
            );
            
            // Activar el elemento actual
            fileListItem.classList.add('active');
            currentSelectedIndex = index;

            // Mostrar imagen
            const reader = new FileReader();
            reader.onload = function(e) {
                mainPreviewImage.src = e.target.result;
                mainPreviewImage.style.display = 'block';
            }
            reader.readAsDataURL(file);

            // Preparar para renombrar
            newFileNameInput.value = file.name;
            saveButton.disabled = false;
        });

        fileList.appendChild(fileListItem);
    });
});

saveButton.addEventListener('click', function() {
    if (currentSelectedIndex === -1) return;

    const file = selectedFiles[currentSelectedIndex];
    let newName = newFileNameInput.value.trim();

    // Obtener la extensión original
    const extension = file.name.split('.').pop();

    // Dividir el nombre en partes
    const parts = newName.split(' - ');
    
    // Construir el nuevo nombre
    // Tomar la primera parte (antes del primer " - ") y la segunda parte (entre los guiones)
    if (parts.length >= 2) {
        const firstPart = parts[0];  // Número de disposición, año, laboratorio
        const secondPart = parts[1];  // Nombre del trámite
        const thirdPart = parts.length > 2 ? parts[2] : '';  // Tipo de trámite

        // Construir el nuevo nombre
        const finalName = thirdPart 
            ? `${firstPart} - ${secondPart} - ${thirdPart}.${extension}`
            : `${firstPart} - ${secondPart}.${extension}`;

        const renamedFile = new File([file], finalName, {type: file.type});
        
        // Guardar archivo localmente
        const link = document.createElement('a');
        link.href = URL.createObjectURL(renamedFile);
        link.download = finalName;
        link.click();

        // Actualizar nombre en la lista
        fileList.children[currentSelectedIndex].textContent = finalName;
        selectedFiles[currentSelectedIndex] = renamedFile;
    } else {
        // Si no cumple con la estructura esperada, guardar con el nombre original
        alert('El nombre no cumple con la estructura esperada.');
    }
});