import os
import shutil
import subprocess
import time

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict

from starlette.middleware.cors import CORSMiddleware
from starlette.responses import FileResponse

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for testing)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Directory for user files
BASE_DIR = "user_data"
os.makedirs(BASE_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="C:/Users/lenovo/PycharmProjects/sandbox/frontend"), name="static")


class FileRequest(BaseModel):
    folder: str
    file_name: str
    code: str = ""


class FolderRequest(BaseModel):
    folder_name: str


@app.get("/")
async def read_index():
    with open("C:/Users/lenovo/PycharmProjects/sandbox/frontend/index.html", "r") as f:
        content = f.read()
    return content


# Create Folder
@app.post("/create-folder")
async def create_folder(request: FolderRequest):
    folder_path = os.path.join(BASE_DIR, request.folder_name)
    if os.path.exists(folder_path):
        raise HTTPException(status_code=400, detail="Folder already exists")
    os.makedirs(folder_path)
    return {"message": f"Folder '{request.folder_name}' created successfully"}


# Create File
@app.post("/create-file")
async def create_file(request: FileRequest):
    folder_path = os.path.join(BASE_DIR, request.folder)
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, request.file_name)
    if not os.path.exists(file_path):
        with open(file_path, "w") as f:
            f.write("")
    return {"message": f"File '{request.file_name}' created in '{request.folder}'."}


# Save File
@app.post("/save-file")
async def save_file(request: FileRequest):
    file_path = os.path.join(BASE_DIR, request.folder, request.file_name)
    with open(file_path, "w") as f:
        f.write(request.code)
    return {"message": f"File '{request.file_name}' saved successfully."}


# List Files & Folders (Tree Structure)
@app.get("/list-files")
async def list_files():
    file_structure: Dict[str, list] = {}
    for folder in os.listdir(BASE_DIR):
        folder_path = os.path.join(BASE_DIR, folder)
        if os.path.isdir(folder_path):
            file_structure[folder] = os.listdir(folder_path)
    return file_structure


# Read File
@app.get("/read-file")
async def read_file(folder: str, file: str):
    file_path = os.path.join(BASE_DIR, folder, file)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    with open(file_path, "r") as f:
        content = f.read()
    return content


# Delete Folder
@app.delete("/delete-folder")
async def delete_folder(request: FolderRequest):
    folder_path = os.path.join(BASE_DIR, request.folder_name)
    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="Folder not found")
    shutil.rmtree(folder_path)
    return {"message": f"Folder '{request.folder_name}' deleted successfully"}


# Delete File
@app.delete("/delete-file")
async def delete_file(request: FileRequest):
    file_path = os.path.join(BASE_DIR, request.folder, request.file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(file_path)
    return {"message": f"File '{request.file_name}' deleted successfully"}


# Execute Code (Python/Java)
@app.post("/execute")
async def execute_code(request: FileRequest):
    file_path = os.path.join(BASE_DIR, request.folder, request.file_name)
    with open(file_path, "w") as f:
        f.write(request.code)

    if request.file_name.endswith(".py"):
        cmd = ["C:\\Users\\lenovo\\PycharmProjects\\rules-service\\.venv\\Scripts\\python.exe", file_path]
    elif request.file_name.endswith(".java"):
        class_name = request.file_name.replace(".java", "")
        compile_cmd = ["javac", file_path]
        run_cmd = ["java", "-cp", request.folder, class_name]

        compile_process = subprocess.run(compile_cmd, capture_output=True, text=True)
        if compile_process.returncode != 0:
            return {"error": compile_process.stderr}

        cmd = run_cmd
    else:
        return {"error": "Unsupported file type"}

    result = subprocess.run(cmd, capture_output=True, text=True)
    return {"output": result.stdout, "error": result.stderr}


# Download Project
@app.get("/download")
async def download():
    shutil.make_archive("project", 'zip', BASE_DIR)
    return {"message": "Download project.zip"}


ZIP_FILE_PATH = "C:\\Users\\lenovo\\PycharmProjects\\sandbox\\user_data\\project.zip"


@app.get("/download")
async def download_project():
    if not os.path.exists(BASE_DIR) or not os.listdir(BASE_DIR):
        raise HTTPException(status_code=404, detail="No files found to download.")

    # Ensure no stale ZIP file exists
    if os.path.exists(ZIP_FILE_PATH):
        os.remove(ZIP_FILE_PATH)

    # Create ZIP with correct structure
    shutil.make_archive("project", "zip", BASE_DIR)

    # Ensure file is fully written before returning response
    time.sleep(1)  # Small delay to allow file system to catch up

    if not os.path.exists(ZIP_FILE_PATH):
        raise HTTPException(status_code=500, detail="ZIP file creation failed.")

    return FileResponse(ZIP_FILE_PATH, filename="project.zip", media_type="application/zip")
