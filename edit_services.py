import re

with open('services.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add product-card class
content = re.sub(r'<div class="reveal" (style="background: var\(--black-card\)[^>]+)', r'<div class="reveal product-card" \1', content)

# Remove the absolute positioned <a> tag over the canvas
content = re.sub(r'<a href="[^"]+" target="_blank" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;"></a>', '', content)

# Change the View link to a button
content = re.sub(r'<a href="[^"]+" target="_blank" class="btn btn-outline"([^>]+)>View</a>', r'<button class="btn btn-outline"\1>View</button>', content)

with open('services.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
