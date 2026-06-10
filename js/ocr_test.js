const imageInput = document.getElementById("imageInput");
const previewImage = document.getElementById("previewImage");
const analyzeBtn = document.getElementById("analyzeBtn");

const detectedNumber = document.getElementById("detectedNumber");
const statusDiv = document.getElementById("status");
const ocrText = document.getElementById("ocrText");

let currentImage = null;

imageInput.addEventListener("change", e => {


currentImage = e.target.files[0];

if(!currentImage){
    return;
}

const reader = new FileReader();

reader.onload = ev => {
    previewImage.src = ev.target.result;
};

reader.readAsDataURL(currentImage);

detectedNumber.textContent = "-";
ocrText.value = "";

});

analyzeBtn.addEventListener("click", async () => {


if(!currentImage){
    alert("Seleccione una imagen");
    return;
}

statusDiv.textContent = "Preparando imagen...";

const img = new Image();

img.src = previewImage.src;

img.onload = async () => {

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    /*
     * Zona superior derecha:
     * Ajustaremos estos valores después
     * de probar con documentos reales.
     */

    const cropX = img.width * 0.45;
    const cropY = 0;

    const cropWidth = img.width * 0.55;
    const cropHeight = img.height * 0.30;

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
    );

    statusDiv.textContent = "Ejecutando OCR...";

    const result = await Tesseract.recognize(
        canvas,
        "spa"
    );

    const text = result.data.text;

    ocrText.value = text;

    let numero = null;

    const patronDisposicion =
        /DISPOSIC(?:ION|IÓN)\s*N[°ºo]?\s*(\d{3,6})/i;

    const match = text.match(patronDisposicion);

    if(match){
        numero = match[1];
    }

    if(!numero){

        const numeros =
            text.match(/\b\d{3,6}\b/g);

        if(numeros && numeros.length){

            /*
             * Primera prueba:
             * tomar el primer número
             * encontrado entre 3 y 6 dígitos.
             */

            numero = numeros[0];
        }
    }

    detectedNumber.textContent =
        numero || "NO DETECTADO";

    statusDiv.textContent = "OCR finalizado";
};


});
