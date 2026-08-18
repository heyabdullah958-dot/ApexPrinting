import os
import shutil
import zipfile

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(ROOT_DIR, "dist-export")
EXPORT_FOLDER = os.path.join(OUTPUT_DIR, "clean-source-code")
ZIP_PATH = os.path.join(OUTPUT_DIR, "apex-printing-clean-code.zip")

EXCLUDED_DIRS = {
    "node_modules",
    "venv",
    ".venv",
    ".git",
    ".expo",
    ".vercel",
    "dist-export",
    "clean-build",
    "dist",
    "build",
    "__pycache__"
}

EXCLUDED_EXACT_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    ".DS_Store",
    "Thumbs.db"
}

def is_excluded(filename):
    _, ext = os.path.splitext(filename)
    if ext.lower() == ".md":
        return True
    if filename.startswith(".env") and filename != ".env.example":
        return True
    if filename in EXCLUDED_EXACT_FILES:
        return True
    return False

def run_export():
    print("====================================================")
    print("  APEX PRINTING - CLEAN SOURCE CODE EXPORTER (PYTHON)")
    print("====================================================")
    print(f"Source Directory : {ROOT_DIR}")
    print(f"Export Output    : {OUTPUT_DIR}")
    print("----------------------------------------------------")

    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(EXPORT_FOLDER, exist_ok=True)

    copied_count = 0
    skipped_count = 0

    for root, dirs, files in os.walk(ROOT_DIR):
        # Prune excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith("dist-export")]

        rel_root = os.path.relpath(root, ROOT_DIR)
        dest_root = os.path.join(EXPORT_FOLDER, rel_root) if rel_root != "." else EXPORT_FOLDER

        os.makedirs(dest_root, exist_ok=True)

        for file in files:
            if is_excluded(file):
                skipped_count += 1
                continue

            src_file = os.path.join(root, file)
            dest_file = os.path.join(dest_root, file)
            shutil.copy2(src_file, dest_file)
            copied_count += 1

    # Create ZIP archive
    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(EXPORT_FOLDER):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, EXPORT_FOLDER)
                zipf.write(full_path, arcname)

    zip_size_mb = os.path.getsize(ZIP_PATH) / (1024 * 1024)

    print("\nEXPORT SUMMARY:")
    print(f"  - Clean Files Copied  : {copied_count}")
    print(f"  - Excluded Items      : {skipped_count} (.md files, node_modules, .env, etc.)")
    print(f"  - Clean Folder Path   : {EXPORT_FOLDER}")
    print(f"  - ZIP Archive Path    : {ZIP_PATH} ({zip_size_mb:.2f} MB)")
    print("\n[SUCCESS] Clean source code export completed successfully!")
    print("====================================================")

if __name__ == "__main__":
    run_export()
