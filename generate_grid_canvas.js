const fs = require('fs');
const items = [
    { title: '3D Designs', file: '3d desgins.pdf' },
    { title: 'Booklet', file: 'Booklet.pdf' },
    { title: 'Brochure', file: 'Brochure.pdf' },
    { title: 'Business Card', file: 'Business card.pdf' },
    { title: 'Calendars', file: 'CALENDERS.pdf' },
    { title: 'Caps', file: 'CAPS.pdf' },
    { title: 'Envelopes', file: 'Envelopes.pdf' },
    { title: 'Flyer', file: 'Flyer.pdf' },
    { title: 'Gift Boxes', file: 'GIFT BOXES.pdf' },
    { title: 'Letterhead', file: 'Letterhead.pdf' },
    { title: 'Magic Mugs', file: 'MAGIC MUGS.pdf' },
    { title: 'Mugs', file: 'MUGS.pdf' },
    { title: 'NCR Forms', file: 'Ncr forms.pdf' },
    { title: 'Note Pads', file: 'Note pads.pdf' },
    { title: 'Pens', file: 'PENS.pdf' },
    { title: 'Paper Bags', file: 'Paper bags.pdf' },
    { title: 'Posters', file: 'Posters.pdf' },
    { title: 'Presentation Folders', file: 'Presentation folders.pdf' },
    { title: 'Promotional Pads', file: 'Promotional pads.pdf' },
    { title: 'Shipping Boxes', file: 'SHIPPING BOXES.pdf' },
    { title: 'Size Changes', file: 'SIZE CHANGES.pdf' },
    { title: 'T-Shirts', file: 'TSHIRTS.pdf' },
    { title: 'Water Bottles', file: 'WATER BOTTLES.pdf' },
    { title: 'Offset Printing', file: 'offset printing .pdf' }
];

let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">\n';

items.forEach(item => {
    const encodedFile = encodeURIComponent(item.file);
    html += `                    <!-- ${item.title} -->
                    <div class="reveal" style="background: var(--black-card); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius); overflow: hidden; display: flex; flex-direction: column; transition: transform 0.3s ease; height: 320px;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div class="pdf-container" style="height: 220px; width: 100%; overflow: hidden; background: #fff; position: relative; display: flex; justify-content: center; align-items: center;">
                            <canvas class="pdf-preview" data-pdf="New%20folder/${encodedFile}" style="max-width: 100%; max-height: 100%; object-fit: contain; z-index: 5; position: relative;"></canvas>
                            <a href="New%20folder/${encodedFile}" target="_blank" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;"></a>
                            <div class="loading-spinner" style="position: absolute; width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid var(--gold); border-radius: 50%; animation: spin 1s linear infinite; z-index: 1;"></div>
                        </div>
                        <div style="padding: 1.25rem; display: flex; flex-direction: row; align-items: center; justify-content: space-between; flex: 1;">
                            <h4 style="font-family: var(--font-serif); font-size: 1rem; color: var(--gold); margin-bottom: 0; text-transform: uppercase; letter-spacing: 1px;">${item.title}</h4>
                            <a href="New%20folder/${encodedFile}" target="_blank" class="btn btn-outline" style="padding: 0.4rem 1rem; font-size: 0.8rem;">View</a>
                        </div>
                    </div>\n`;
});

html += '                </div>';

fs.writeFileSync('new_grid_canvas.html', html);
console.log('Done generating new_grid_canvas.html');
