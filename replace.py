import os
import glob

views_dir = r"e:\MCA\Friends\swetha\proj dev\crime-analysis-ml\server\views"
ejs_files = glob.glob(os.path.join(views_dir, "**/*.ejs"), recursive=True)

for file in ejs_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '2020' in content:
        # replace instances of 2020 with 2026
        content = content.replace('2020', '2026')
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file}")

print("All EJS views updated to 2026!")
