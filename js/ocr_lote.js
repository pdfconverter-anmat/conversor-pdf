const imageInput = document.getElementById("imageInput");
const processBtn = document.getElementById("processBtn");
const downloadBtn = document.getElementById("downloadBtn");

const fileList = document.getElementById("fileList");
const resultList = document.getElementById("resultList");

const totalFiles = document.getElementById("totalFiles");
const processedFiles = document.getElementById("processedFiles");

const progressBar = document.getElementById("progressBar");

let selectedFiles = [];
let renamedFiles = [];

imageInput.addEventListener("change", () => {


selectedFiles = Array.from(imageInput.files);

totalFiles.textContent = selectedFiles.length;

fileList.innerHTML = "";

selectedFiles.forEach(file => {

    const div = document.createElement("div");

    div.className = "item";
    div.textContent = file.name;

    fileList.appendChild(div);

});


});

processBtn.addEventListener("click", async () => {


if(selectedFiles.length === 0){
    alert("Seleccione archivos");
    return;
}

resultList.innerHTML = "";
renamedFiles = [];

const grupos = {};

let procesados = 0;

for(const file of selectedFiles){

    try{

        const disposicion =
            await detectarDisposicion(file);

        if(!grupos[disposicion]){

            grupos[disposicion] = [];

        }

        grupos[disposicion].push(file);

    }
    catch{

        if(!grupos["REVISAR"]){

            grupos["REVISAR"] = [];

        }

        grupos["REVISAR"].push(file);

    }

    procesados++;

    processedFiles.textContent = procesados;

    progressBar.style.width =
        ((procesados / selectedFiles.length) * 100) + "%";
}

for(const disp in grupos){

    let contador = 1;

    for(const file of grupos[disp]){

        const extension =
            file.name.split(".").pop();

        const nuevoNombre =
            disp +
            "_" +
            String(contador).padStart(2,"0") +
            "." +
            extension;

        renamedFiles.push({
            file,
            nuevoNombre
        });

        const div =
            document.createElement("div");

        div.className =
            disp === "REVISAR"
            ? "item error"
            : "item ok";

        div.textContent =
            file.name +
            " → " +
            nuevoNombre;

        resultList.appendChild(div);

        contador++;
    }
}

downloadBtn.disabled = false;


});

async function detectarDisposicion(file){


const dataUrl =
    await fileToDataURL(file);

const img = new Image();

img.src = dataUrl;

await img.decode();

const canvas =
    document.createElement("canvas");

const ctx =
    canvas.getContext("2d");

const cropX =
    img.width * 0.45;

const cropY = 0;

const cropWidth =
    img.width * 0.55;

const cropHeight =
    img.height * 0.30;

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

const result =
    await Tesseract.recognize(
        canvas,
        "spa"
    );

const text =
    result.data.text;

const numeros =
    text.match(/\b\d{3,6}\b/g);

if(numeros && numeros.length){

    return numeros[0];

}

throw new Error();


}

downloadBtn.addEventListener("click", async () => {


const zip = new JSZip();

for(const item of renamedFiles){

    zip.file(
        item.nuevoNombre,
        item.file
    );

}

const content =
    await zip.generateAsync({
        type:"blob"
    });

saveAs(
    content,
    "renombradas.zip"
);


});

function fileToDataURL(file){


return new Promise((resolve,reject)=>{

    const reader =
        new FileReader();

    reader.onload =
        e => resolve(e.target.result);

    reader.onerror = reject;

    reader.readAsDataURL(file);

});


}
