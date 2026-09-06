import zipfile
import json
import os

os.makedirs("dist", exist_ok=True)
zip_path = os.path.join("dist", "AutoBookmark-firefox-v1.0.0.zip")

if os.path.exists(zip_path):
    os.remove(zip_path)

# Load base manifest and adapt for Firefox Manifest V3
with open("manifest.json", "r", encoding="utf-8") as f:
    manifest = json.load(f)

# Firefox requires gecko ID in browser_specific_settings
manifest["browser_specific_settings"] = {
    "gecko": {
        "id": "autobookmark@sinary.org",
        "strict_min_version": "109.0"
    }
}

# Firefox MV3 prefers background.scripts (event page) or service_worker
manifest["background"] = {
    "scripts": ["background.js"]
}

# Write adapted manifest into zip
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("manifest.json", json.dumps(manifest, indent=2))
    
    # Include other files
    files_to_include = [
        "background.js",
        "content.js",
        "content.css",
        "popup.html",
        "popup.js",
        "popup.css",
        "sinary-logo.svg",
    ]
    for f in files_to_include:
        if os.path.exists(f):
            zf.write(f, f.replace("\\", "/"))
    
    # Include icons
    if os.path.exists("icons"):
        for root, _, files in os.walk("icons"):
            for file in files:
                if file in ["icon16.png", "icon48.png", "icon64.png", "icon128.png", "sinary-icon.png"]:
                    full_path = os.path.join(root, file)
                    arcname = f"icons/{file}"
                    zf.write(full_path, arcname)

print(f"Successfully packaged Firefox extension: {zip_path}")
with zipfile.ZipFile(zip_path, "r") as zf:
    for name in zf.namelist():
        print(f"  - {name}")
