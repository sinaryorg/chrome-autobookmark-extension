import zipfile
import json
import os
import shutil

os.makedirs("dist", exist_ok=True)

with open("manifest.json", "r", encoding="utf-8") as f:
    manifest = json.load(f)
version = manifest.get("version", "1.0.0")

zip_path = os.path.join("dist", f"AutoBookmark-v{version}.zip")
latest_alias = os.path.join("dist", "AutoBookmark.zip")

if os.path.exists(zip_path):
    os.remove(zip_path)

files_to_include = [
    "manifest.json",
    "background.js",
    "content.js",
    "content.css",
    "popup.html",
    "popup.js",
    "popup.css",
    "sinary-logo.svg",
]

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for f in files_to_include:
        if os.path.exists(f):
            zf.write(f, f.replace("\\", "/"))
    
    # Walk icons folder and ensure forward slashes
    if os.path.exists("icons"):
        for root, _, files in os.walk("icons"):
            for file in files:
                if file in ["icon16.png", "icon48.png", "icon128.png", "sinary-icon.png"]:
                    full_path = os.path.join(root, file)
                    arcname = f"icons/{file}"
                    zf.write(full_path, arcname)

print(f"Successfully packaged {zip_path}")
shutil.copyfile(zip_path, latest_alias)
print(f"Also updated {latest_alias}")
with zipfile.ZipFile(zip_path, "r") as zf:
    for name in zf.namelist():
        print(f"  - {name}")
