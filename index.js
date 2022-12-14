#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const pckg = require(path.join(process.cwd(), 'package.json'));

let options = {
	cwd: process.cwd(),
	from:'src/**/*.html',
	to: 'src/blocks',
	omit: '@@',
	use: '',
	js: ''
};

if (pckg.bemtree)
	options = {...options, ...pckg.bemtree }


/* Создать массив из всех классов которые есть в файлах найденных по заданному шаблону поиска */
const getClasses = (options) => {
	let html = '';
	let classes = [];

	glob.sync(options.from.replace('%', '|'), {cwd: options.cwd}).forEach((file) => {
		try {
			 html = fs.readFileSync(path.join(options.cwd, file), 'utf-8');
		} catch (err) {
			console.error(err)
		}
	
		let classMatches = html.match(/class=("([^"]*)")|class=('([^']*)')/ig) || []; // классы
		
		classMatches.forEach((classString) => {
			let classesFromString = classString.replace(/class=/i, '').replace(/'|"/g, '').match(/\S+/g) || [];
			classes = [...classes, ...classesFromString];
		});
	});
	
	// удаляю из массива повторяющиеся имена классов, а уникальные сортирую по блокам
	classes = Array.from(new Set(classes)).sort((a, b) => {
		a = a.split('_')[0];
		b = b.split('_')[0];
		return (a < b) ? -1 : (a > b) ? 1 : 0;
	}).sort((a, b) => {
		// чтобы имя блока всегда было первым
		return ((a.indexOf('_') == -1) && (a == b.split('_')[0])) ? -1 : 0;
	});


	return classes;
}


/* Преобразовать массив классов в объект с вложенностью соответствующей БЭМ иерархии */
const toJSON = (classes, options) => {
	let bemjson = {};
	let blockname = '';
	let omit = new RegExp(`^(${options.omit.replace(/\s*/g, '').replace(/,/g, '|')}).*?`);
	let use = new RegExp(`^(${options.use.replace(/\s*/g, '').replace(/,/g, '|')}).*?`);

	// наполняю bemjson
	classes.forEach((item) => {
		// если имя класса есть в списке исключений - пропускаю
		if(!item.match(use) || item.match(omit)) return;

		// если нет _ - блок
		if ((item.indexOf('_') == -1) && item.indexOf('-js') == -1) {
			blockname = item;
			bemjson[blockname] = {'mods':'','elems':{}};
		}

		// если есть блок-js - создать js файл с именем блока
		if (item.indexOf(blockname + '-js') > -1) {
			bemjson[blockname]['js'] = true;
		}

		// если только один _ - модификатор блока
		if ((item.match(/_/g) || []).length == 1) {
			item = item.replace(blockname+'_', '');
			bemjson[blockname]['mods'] += (item + ',');
		}

		// если есть blockname__ - элемент или его модификатор
		if ((item.indexOf(blockname+'__') > -1)) {
			let rest = item.replace(blockname+'__', '').split('_');
			let elem = bemjson[blockname]['elems'][rest[0]];

			if (!elem)
				bemjson[blockname]['elems'][rest[0]] = {'mods':''};

			if(rest[1])
				elem['mods'] += (rest[1] + ',');
		}
	});
	// console.dir(JSON.stringify(bemjson));
	return bemjson;
}


/* Создать файловую структуру БЭМ для SCSS в заданной директории */
const createStucture = (bemjson, options) => {
	let jsImportPath = path.posix.relative(path.dirname(options.js), options.to);
	let imports = [];

	for (const blockName in bemjson) {
		const dirPath = path.join(options.cwd, options.to, blockName);
		const filePath = path.join(dirPath, `${blockName}.scss`);
		const block = bemjson[blockName];
		let fileContent = `.${blockName} {\n\t$self: &;\n\n`;

		if (fileExist(filePath) === false) {
			try {
				fs.mkdirSync(dirPath, { recursive: true });
			} catch (err) {
				console.error(`Directory NOT created: ${err}`)
			}
		}

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
			createFiles(path.join(dirPath, `${blockName}.js`), `(() => {\n\n\n})();\n`);
			imports.push(`import "${jsImportPath}/${blockName}/${blockName}.js";`);
			console.log(`File prepare to import: ${blockName}.js`);
		}
		fileContent += `}\n`;
		
		createFiles(filePath, fileContent);
	}

	if(options.js && imports.length) {
		addImportJS(options, imports);
	}
}
	
	
const fileExist = (filePath) => {
	try {
		fs.statSync(filePath);
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}


const createFiles = (filePath, fileContent) => {
	if (fileExist(filePath) === false) {
		fs.writeFile(filePath, fileContent, (err) => {
			if (err) {
				return console.log(`File NOT created: ${err}`);
			}
			console.log('File created: ' + filePath);
		});
	}
}
	
	
const addImportJS = (options, imports) => {
		const lb = require('os').EOL;
		let content = [];

	if (fileExist(options.js) === false) {
		try {
			fs.mkdirSync(path.dirname(options.js), { recursive: true });
		} catch (err) {
			console.error(`Directory NOT created: ${err}`)
		}
	} else {
		try {
			content = fs.readFileSync(options.js, 'utf-8').toString().split(lb);
		} catch (err) {
			console.error(err)
		}
	}

	imports.forEach((row) => {
		if (! content.includes(row))
			content.push(row);
	});

	fs.writeFile(options.js, content.join(lb), 'utf-8', (err) => {
		if (err) {
			return console.log(`Imports NOT written: ${err}`);
		}
		console.log(`Imports written to: ${path.join(options.cwd, options.js)}`);
	});
}


if (require.main === module) {
	for (let option of process.argv.slice(2)) {
		let [key, value] = option.split('=');
		options[key] = value;
	}

	const classes = getClasses(options);
	const bemjson = toJSON(classes, options);
	createStucture(bemjson, options);

} else {
	module.exports = (opt) => {
		options = {...options, ...opt };
		
		const classes = getClasses(options);
		const bemjson = toJSON(classes, options);
		createStucture(bemjson, options);
	}
}