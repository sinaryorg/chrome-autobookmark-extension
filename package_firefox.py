import zipfile
import json
import os

os.makedirs("dist", exist_ok=True)

# Load base manifest and adapt for Firefox Manifest V3
with open("manifest.json", "r", encoding="utf-8") as f:
    manifest = json.load(f)

version = manifest["version"]
zip_path = os.path.join("dist", f"AutoBookmark-firefox-v{version}.zip")
latest_alias = os.path.join("dist", "AutoBookmark-firefox.zip")

if os.path.exists(zip_path):
    os.remove(zip_path)

# Firefox requires gecko ID and data_collection_permissions in browser_specific_settings
manifest["browser_specific_settings"] = {
    "gecko": {
        "id": "autobookmark@sinary.org",
        "strict_min_version": "140.0",
        "data_collection_permissions": {
            "required": ["none"]
        }
    }
}

# Remove Chrome-only "favicon" permission from Firefox package
if "permissions" in manifest and "favicon" in manifest["permissions"]:
    manifest["permissions"].remove("favicon")

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

import shutil
shutil.copyfile(zip_path, latest_alias)
print(f"Also updated {latest_alias}")
print(f"Successfully packaged Firefox extension: {zip_path}")
with zipfile.ZipFile(zip_path, "r") as zf:
    for name in zf.namelist():
        print(f"  - {name}")
