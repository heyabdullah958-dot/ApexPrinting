const fs = require('fs');
let content = fs.readFileSync('services.html', 'utf8');
const newGrid = fs.readFileSync('new_grid_canvas.html', 'utf8');
const startStr = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">';
const startIdx = content.indexOf(startStr, content.indexOf('id="pdf-catalog"'));
const endIdx = content.indexOf('</div>\r\n            </div>\r\n\r\n        </div>\r\n    </div>', startIdx);
const endIdxLF = content.indexOf('</div>\n            </div>\n\n        </div>\n    </div>', startIdx);

const finalEndIdx = endIdx !== -1 ? endIdx : endIdxLF;

if (startIdx !== -1 && finalEndIdx !== -1) {
    fs.writeFileSync('services.html', content.substring(0, startIdx) + newGrid + '\n' + content.substring(finalEndIdx));
    console.log('Replaced successfully');
} else {
    console.log('Could not find indices', startIdx, finalEndIdx);
}
