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
    catch(error){

        console.error(
            file.name,
            error
        );

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

const img =
    new Image();

img.src = dataUrl;

await img.decode();

const canvas =
    document.createElement("canvas");

const ctx =
    canvas.getContext("2d");

/*
 * Zona superior derecha
 */

const cropX =
    img.width * 0.35;

const cropY = 0;

const cropWidth =
    img.width * 0.65;

const cropHeight =
    img.height * 0.20;

canvas.width =
    cropWidth;

canvas.height =
    cropHeight;

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

/*
 * Blanco y negro
 */

const imageData =
    ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

const data =
    imageData.data;

for(let i=0;i<data.length;i+=4){

    const gray =
        (
            data[i] +
            data[i+1] +
            data[i+2]
        ) / 3;

    const value =
        gray > 180
        ? 255
        : 0;

    data[i] = value;
    data[i+1] = value;
    data[i+2] = value;
}

ctx.putImageData(
    imageData,
    0,
    0
);

const result =
    await Tesseract.recognize(
        canvas,
        "spa"
    );

const text =
    result.data.text || "";

console.log(
    "OCR:",
    text
);

return extraerDisposicion(text);


}

function extraerDisposicion(text){


const lineas =
    text.split(/\r?\n/);

/*
 * PRIORIDAD 1
 */

for(const linea of lineas){

    const l =
        linea.toUpperCase();

    if(
        l.includes("POSIC")
        ||
        l.includes("SPOSIC")
    ){

        const nums =
            l.match(/\d{3,6}/g);

        if(nums){

            for(const n of nums){

                if(
                    esDisposicionValida(n)
                ){

                    return n;
                }
            }
        }
    }
}

/*
 * PRIORIDAD 2
 */

const match =
    text.match(
        /(?:DISPOS|SPOSIC)[^\d]{0,20}(\d{3,6})/i
    );

if(
    match &&
    esDisposicionValida(match[1])
){

    return match[1];
}

/*
 * PRIORIDAD 3
 */

const numeros =
    text.match(/\d{3,6}/g);

if(numeros){

    for(const n of numeros){

        if(
            esDisposicionValida(n)
        ){

            return n;
        }
    }
}

throw new Error(
    "Disposición no encontrada"
);


}

function esDisposicionValida(n){


const valor =
    parseInt(
        n,
        10
    );

if(
    valor >= 1900 &&
    valor <= 2100
){
    return false;
}

if(valor < 100){

    return false;
}

return true;


}

downloadBtn.addEventListener("click", async () => {


const zip =
    new JSZip();

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


return new Promise(
    (
        resolve,
        reject
    ) => {

        const reader =
            new FileReader();

        reader.onload =
            e => resolve(
                e.target.result
            );

        reader.onerror =
            reject;

        reader.readAsDataURL(
            file
        );
    }
);


}
