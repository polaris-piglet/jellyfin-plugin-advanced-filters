const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
const output=read('src/core.js')+'\nwindow.JellyfinLibraryFilterCSS='+JSON.stringify(read('src/style.css'))+';\n'+read('src/ui.js');
fs.writeFileSync(path.join(root,'dist/library-filter.js'),output);
console.log('Built dist/library-filter.js (no runtime dependencies)');
