#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require( 'glob' );
const mkdirp = require('mkdirp2');
let options = {
	cwd: process.cwd(),
	from:'./src/**/!(_)*.html',
	to: 'src/blocks'
};


/* Создать массив из всех классов которые есть в файлах найденных по заданному шаблону поиска */
const getClasses = (options) => {
	let classes = [];
	glob.sync(options.from, {cwd:options.cwd}).forEach((file) => {
		let html = fs.readFileSync(path.join(options.cwd, file), 'utf-8');
		let classMatches = html.match(/class=("([^"]*)")|class=('([^']*)')/ig)  || [];
		
		classMatches.forEach((classString) => {
			let classesFromString = classString.replace(/class=/i, '').replace(/'|"/g, '').match(/\S+/g);
			classes = [...classes, ...classesFromString];
		})
		
	});
	// удаляю из массива повторяющиеся имена классов, а уникальные сортирую по алфавиту
	classes = Array.from(new Set(classes)).sort();
	return classes;
}


/* Преобразовать массив классов в объект с вложенностью соответствующей БЭМ иерархии */
const toJSON = (classes) => {
	let bemjson = {};
	let blockname = '';
	let elemname = '';
	let elem = '';
	
	// наполняю bemjson
	classes.forEach((item) => {
		// если нет _ - блок
		if ((item.indexOf('_') == -1) && item.indexOf('-js') == -1) {
			blockname = item;
			bemjson[blockname] = {'mods':'','elems':{}};
		}
		// если есть блок-js - создать js файл с именем блока
		if ((item.indexOf(blockname + '-js') > -1)) {
			bemjson[blockname]['js'] = true;
		}
		// если только один _ - модификатор блока
		if ((item.match(/_/g) || []).length == 1) {
			item = item.replace(blockname+'_', '');
			bemjson[blockname]['mods'] += (item + ',');
		}
		// если есть блок__ но всего _ меньше трех - элемент
		if ((item.indexOf(blockname+'__') > -1) && ((item.match(/_/g) || []).length < 3)) {
			elemname = item;
			elem = item.replace(blockname+'__', '');
			bemjson[blockname]['elems'][elem] = {'mods':''};
		}
		// если есть элемент_ и элемент принадлежит текущему блоку - модификатор элемента
		if ((elemname.indexOf(blockname) > -1) && (item.indexOf(elemname+'_') > -1)) {
			item = item.replace(elemname+'_', '');
			bemjson[blockname]['elems'][elem]['mods'] += (item + ',');
		}
	});
	return bemjson;
}


/* Создать файловую структуру БЭМ для SCSS в заданной директории */
const createStucture = (bemjson, options) => {
	for (const blockName in bemjson) {
		const dirPath = `${options.cwd}/${options.to}/${blockName}/`;
		const filePath = `${dirPath}${blockName}.scss`;
		const block = bemjson[blockName];
		let fileContent = `.${blockName} {\n\t$self: &;\n\n`;

		const made = mkdirp.sync(dirPath);
		console.log(`Создание папки: ${made}`);

		if (block.mods) {
			let modifiers = block.mods.replace(/,\s*$/, '').split(',');
			modifiers.forEach((modifier) => fileContent += `\t&_${modifier.trim()} {\n\t\t\n\t}\n\n`);

		}

		if (Object.keys(block.elems).length !== 0) {
			for (const elem in block.elems) {
				if (block.elems.hasOwnProperty(elem)) {
					
					fileContent += `\t&__${elem} {\n`;
					if (block.elems[elem]['mods']) {
						let modifiers = block.elems[elem]['mods'].replace(/,\s*$/, '').split(',');
						modifiers.forEach((modifier) => fileContent += `\n\t\t&_${modifier.trim()} {\n\t\t\t\n\t\t}\n`);
					} else {
						fileContent += `\n`;
					}
					fileContent += `\t}\n\n`;
				}
			}
		}

		if (block.js) {
			createFiles(`${dirPath}${blockName}.js`, `// (() => {\n// code..\n// })();\n`);
		}
		fileContent += `}\n`;

		createFiles(filePath, fileContent);
	}
}


const createFiles = (filePath, fileContent) => {
	if (fileExist(filePath) === false) {
		fs.writeFile(filePath, fileContent, (err) => {
			if (err) {
				return console.log(`Файл НЕ создан: ${err}`);
			}
			console.log('Файл создан: ' + filePath);
		});
	}
}


const fileExist = (filePath) => {
	const fs = require('fs');
	try {
		fs.statSync(filePath);
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}


if (require.main === module) {
	for (let option of process.argv.slice(2)) {
		let [key, value] = option.split('=');
		options[key] = value.replace('%', '|');
	}

	const classes = getClasses(options);
	const bemjson = toJSON(classes);
	createStucture(bemjson, options);

} else {
	module.exports = (opt) => {
		options = {...options, ...opt };
		
		const classes = getClasses(options);
		const bemjson = toJSON(classes);
		createStucture(bemjson, options);
	}
}

