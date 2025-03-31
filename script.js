let openFiles = {};
const BASE_URL = "http://127.0.0.1:8000";
let editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    mode: "python",
    theme: "dracula",
    lineNumbers: true,
    matchBrackets: true
});

// Load file tree
async function loadFiles() {
    const response = await fetch(`${BASE_URL}/list-files`);
    const files = await response.json();
    const fileTree = document.getElementById("file-tree");
    fileTree.innerHTML = "";

    for (let folder in files) {
        let folderElement = document.createElement("div");
        folderElement.className = "folder";
        folderElement.textContent = folder;
        folderElement.onclick = () => toggleFolder(folderElement);

        let fileList = document.createElement("div");
        fileList.style.display = "none";

        files[folder].forEach(file => {
            let fileElement = document.createElement("div");
            fileElement.className = "file";
            fileElement.textContent = file;
            fileElement.onclick = () => openFile(folder, file);
            fileList.appendChild(fileElement);
        });

        folderElement.appendChild(fileList);
        fileTree.appendChild(folderElement);
    }
}
// Switch active tab
function switchTab(fileName) {
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));

    if (openFiles[fileName]) {
        openFiles[fileName].tab.classList.add("active");
        editor.setValue(openFiles[fileName].code);
    }
}

// Toggle folder
function toggleFolder(folderElement) {
    let fileList = folderElement.children[0];
    fileList.style.display = fileList.style.display === "none" ? "block" : "none";
}

// Open file
async function openFile(folder, fileName) {
    if (openFiles[fileName]) return;
    const response = await fetch(`${BASE_URL}/read-file?folder=${folder}&file=${fileName}`);
    const code = await response.text();

    let tab = document.createElement("div");
    tab.className = "tab";
    tab.textContent = fileName;
    tab.onclick = () => switchTab(fileName);

    let closeBtn = document.createElement("span");
    closeBtn.className = "close-btn";
    closeBtn.textContent = " ✖";
    closeBtn.onclick = (event) => { event.stopPropagation(); closeTab(fileName); };

    tab.appendChild(closeBtn);
    document.getElementById("tabs").appendChild(tab);

    openFiles[fileName] = { folder, code, tab };
    switchTab(fileName);
}

// Save all open files
async function saveAllFiles() {
    for (let fileName in openFiles) {
        let folder = openFiles[fileName].folder;
        let code = editor.getValue();

        await fetch(`${BASE_URL}/save-file`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder, file_name: fileName, code }),
        });
    }
    alert("All files saved!");
}

// Close a tab
function closeTab(fileName) {
    if (!openFiles[fileName]) return;

    openFiles[fileName].tab.remove();
    delete openFiles[fileName];

    let remainingTabs = Object.keys(openFiles);
    if (remainingTabs.length > 0) switchTab(remainingTabs[0]);
    else editor.setValue("");  // Clear editor if no files are open
}

// Open file in editor
async function openFile(folder, fileName) {
    if (openFiles[fileName]) return;  // File already opened

    const response = await fetch(`${BASE_URL}/read-file?folder=${folder}&file=${fileName}`);
    const code = await response.text();

    let tab = document.createElement("div");
    tab.className = "tab";
    tab.textContent = fileName;
    tab.onclick = () => switchTab(fileName);

    let closeBtn = document.createElement("span");
    closeBtn.className = "close-btn";
    closeBtn.textContent = " ✖";
    closeBtn.onclick = (event) => { event.stopPropagation(); closeTab(fileName); };

    tab.appendChild(closeBtn);
    document.getElementById("tabs").appendChild(tab);

    openFiles[fileName] = { folder, code, tab };
    switchTab(fileName);  // ✅ No error now
}


// Run code
async function runCode() {
    let outputPanel = document.getElementById("console-output");
    outputPanel.textContent = "Running...";

    let activeTab = document.querySelector(".tab.active");
    if (!activeTab) {
        outputPanel.textContent = "⚠ No file is open!";
        return;
    }

    let fileName = activeTab.textContent.replace(" ✖", "");
    let fileData = openFiles[fileName];

    if (!fileData) {
        outputPanel.textContent = "⚠ Unable to find file data!";
        return;
    }

    let folder = fileData.folder;
    let code = editor.getValue();

    try {
        const response = await fetch(`${BASE_URL}/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder, file_name: fileName, code }),
        });

        const result = await response.json();
        outputPanel.textContent = result.output || result.error;
    } catch (error) {
        outputPanel.textContent = `Error: ${error.message}`;
    }
}

// Create a new folder
async function createFolder() {
    let folderName = prompt("Enter folder name:");
    if (!folderName) return;

    try {
        const response = await fetch(`${BASE_URL}/create-folder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder_name: folderName }),
        });

        if (!response.ok) throw new Error("Failed to create folder");

        alert(`Folder '${folderName}' created successfully.`);
        loadFiles();  // Refresh file tree
    } catch (error) {
        alert("Error creating folder: " + error.message);
    }
}

// Create a new file
async function createFile() {
    let folder = prompt("Enter folder name:");
    let fileName = prompt("Enter file name:");
    if (!folder || !fileName) return;

    try {
        const response = await fetch(`${BASE_URL}/create-file`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder, file_name: fileName }),
        });

        if (!response.ok) throw new Error("Failed to create file");

        alert(`File '${fileName}' created in folder '${folder}'.`);
        loadFiles();  // Refresh file tree
    } catch (error) {
        alert("Error creating file: " + error.message);
    }
}

// Delete a folder
async function deleteFolder() {
    let folderName = prompt("Enter folder name to delete:");
    if (!folderName) return;

    try {
        const response = await fetch(`${BASE_URL}/delete-folder`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder_name: folderName }),
        });

        if (!response.ok) throw new Error("Failed to delete folder");

        alert(`Folder '${folderName}' deleted successfully.`);
        loadFiles();  // Refresh file tree
    } catch (error) {
        alert("Error deleting folder: " + error.message);
    }
}


async function deleteFile() {
    let folder = prompt("Enter folder name:");
    let fileName = prompt("Enter file name to delete:");
    if (!folder || !fileName) return;

    try {
        const response = await fetch(`${BASE_URL}/delete-file`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder, file_name: fileName }),
        });

        if (!response.ok) throw new Error("Failed to delete file");

        alert(`File '${fileName}' deleted successfully.`);
        loadFiles();  // Refresh file tree
    } catch (error) {
        alert("Error deleting file: " + error.message);
    }
}
// Download project
async function downloadProject() {
    const response = await fetch(`${BASE_URL}/download-project`);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "project.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.onload = loadFiles;
