// Assume JSZip and heic2any libraries are loaded

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const convertButton = document.getElementById('convert-button');
const downloadAllButton = document.getElementById('download-all-button');
const output = document.getElementById('output');
const previewModal = document.getElementById('preview-modal');
const previewImage = document.getElementById('preview-image');
const zipModal = document.getElementById('zip-modal');
const zipProgressBar = document.createElement('div');
zipProgressBar.id = "zip-progress-bar";
const zipProgressInner = document.createElement('div');
zipProgressInner.id = "zip-progress-bar-inner";
zipProgressBar.appendChild(zipProgressInner);
document.querySelector(".modal-content").appendChild(zipProgressBar); // Add progress bar to ZIP modal

let heicFiles = [];
let convertedImages = [];

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => e.preventDefault());
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', () => handleFiles(fileInput.files));

function handleFiles(files) {
  heicFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.heic'));
  if (heicFiles.length > 0) {
    convertButton.disabled = false;
    displayFileNames();
  } else {
    alert("Please upload HEIC files only.");
    convertButton.disabled = true;
  }
}

function displayFileNames() {
  output.innerHTML = "<p>Ready to convert:</p>";
  heicFiles.forEach(file => {
    const fileElement = document.createElement('p');
    fileElement.textContent = file.name;
    output.appendChild(fileElement);
  });
}

convertButton.addEventListener('click', async () => {
  output.innerHTML = "";
  convertedImages = [];  // Reset converted images
  for (let file of heicFiles) {
    const fileContainer = document.createElement('div');
    fileContainer.classList.add('file-output');

    const fileNameElement = document.createElement('p');
    fileNameElement.textContent = `Converting: ${file.name}`;
    fileContainer.appendChild(fileNameElement);

    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-bar');
    const progressInner = document.createElement('div');
    progressInner.classList.add('progress-bar-inner');
    progressBar.appendChild(progressInner);
    fileContainer.appendChild(progressBar);

    output.appendChild(fileContainer);

    const jpegImage = await convertToJpeg(file, progressInner);
    const jpegName = file.name.replace(/\.heic$/i, ".jpg");
    convertedImages.push({ name: jpegName, url: jpegImage });
    displayConvertedFile(jpegImage, jpegName, fileContainer);
  }
  heicFiles = [];
  convertButton.disabled = true;
  showZipModal();  // Show the ZIP download modal
});

async function convertToJpeg(file, progressInner) {
  return new Promise(async (resolve, reject) => {
    try {
      progressInner.style.width = "50%";  // Start progress
      const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 1 });
      progressInner.style.width = "100%";  // Complete progress
      resolve(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Conversion failed:", error);
      reject(error);
    }
  });
}

function displayConvertedFile(imageUrl, imageName, container) {
  const downloadLink = document.createElement('a');
  downloadLink.href = imageUrl;
  downloadLink.download = imageName; // Keeps the original name with .jpg extension
  downloadLink.textContent = `Download ${imageName}`;
  downloadLink.classList.add('download-button');
  container.appendChild(downloadLink);

  // Add preview button
  const previewButton = document.createElement('button');
  previewButton.textContent = 'Preview';
  previewButton.classList.add('preview-button');
  container.appendChild(previewButton);

  // Show modal with preview image on button click
  previewButton.addEventListener('click', () => {
    previewImage.src = imageUrl;
    previewModal.style.display = "block";
  });
}

function closePreviewModal() {
  previewModal.style.display = "none";
}

function showZipModal() {
  zipModal.style.display = "block";
  const modalContent = zipModal.querySelector(".modal-content p");
  modalContent.textContent = convertedImages.length > 1 ? "All images have been converted!" : "Image has been converted!";
  downloadAllButton.textContent = convertedImages.length > 1 ? "Download All as ZIP" : "Download Image";
  zipProgressBar.style.display = "none";  // Hide the progress bar initially
}

function closeZipModal() {
  zipModal.style.display = "none";
}

downloadAllButton.addEventListener('click', async () => {
  if (convertedImages.length === 1) {
    // Directly download single image
    const singleImage = convertedImages[0];
    const link = document.createElement('a');
    link.href = singleImage.url;
    link.download = singleImage.name;
    link.click();
  } else {
    // Zip all images for download
    zipProgressBar.style.display = "block";
    zipProgressInner.style.width = "0%";  // Start at 0%

    const zip = new JSZip();
    const folder = zip.folder("converted_images");

    for (let i = 0; i < convertedImages.length; i++) {
      const img = convertedImages[i];
      const response = await fetch(img.url);
      const blob = await response.blob();
      folder.file(img.name, blob); // Keeps original name with .jpg extension
      
      // Update progress bar based on the number of files
      const progress = ((i + 1) / convertedImages.length) * 100;
      zipProgressInner.style.width = `${progress}%`;
    }

    zip.generateAsync({ type: "blob" }).then((blob) => {
      zipProgressInner.style.width = "100%";  // Complete progress
      const zipUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = "converted_images.zip";
      link.click();
      URL.revokeObjectURL(zipUrl); // Clean up the URL object
    }).finally(() => {
      closeZipModal(); // Close ZIP modal after download
    });
  }
});
