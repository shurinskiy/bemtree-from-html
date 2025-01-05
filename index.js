#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const pckg = require(path.join(process.cwd(), 'package.json'));


/**
 * Опции по умолчанию для инструмента.
 *
 * @typedef {Object} Options
 * @property {string} cwd Рабочий каталог.
 * @property {string} from Шаблон для поиска HTML-файлов.
 * @property {string} to Директория, куда будет сохраняться структура стилей.
 * @property {string} omit Классы, которые следует исключить из обработки.
 * @property {string} use Классы, которые должны использоваться.
 * @property {string} js Путь к файлу JavaScript, содержащему импорты для JS-кода блоков.
 * @property {string} prefix Строка, добавляемая в начало каждого SCSS-файла.
 * @property {string} suffix Строка, добавляемая сразу после открытия блока SCSS-файла.
 */

let options = {
	cwd: process.cwd(),
	from:'src/**/*.html',
	to: 'src/blocks',
	omit: '@@',
	use: '',
	js: '',
	prefix: '',
	suffix: ''
};

if (pckg.bemtree)
	options = {...options, ...pckg.bemtree }


/**
 * Функция для сбора всех классов и data-атрибутов из HTML-файлов,
 * соответствующих заданному шаблону поиска.
 *
 * @param {Options} options Настройки инструмента.
 * @returns {Object} Объект с собранными классами и атрибутами.
 */

const getClasses = (options) => {
	let html = '';
	let entries = {
		classes: [],
		attrs: []
	};

	glob.sync(options.from.replace('%', '|'), {cwd:options.cwd}).forEach((file) => {
		try {
				html = fs.readFileSync(path.join(options.cwd, file), 'utf-8');
		} catch (err) {
			console.error(err)
		}
	
		let classMatches = html.match(/class=("([^"]*)")|class=('([^']*)')/ig) || []; // классы
		let attrMatches = html.match(/\bdata-(-|\w)+/ig) || []; // data- атрибуты
		
		classMatches.forEach((classString) => {
			let classesFromString = classString.replace(/class=/i, '').replace(/'|"/g, '').match(/\S+/g) || [];
			entries.classes = [...entries.classes, ...classesFromString];
		});

		attrMatches.forEach((attrString) => {
			let attrsFromString = attrString.replace(/data-/i, '').match(/\S+/g) || [];
			entries.attrs = [...entries.attrs, ...attrsFromString];
		});

	});

	// удаляю из массива повторяющиеся имена data- атрибутов
	entries.attrs = Array.from(new Set(entries.attrs));
	
	// удаляю из массива повторяющиеся имена классов, а уникальные сортирую по блокам
	entries.classes = Array.from(new Set(entries.classes)).sort((a, b) => {
		a = a.split('_')[0];
		b = b.split('_')[0];
		return (a < b) ? -1 : (a > b) ? 1 : 0;
	}).sort((a, b) => {
		// чтобы имя блока всегда было первым
		return (!a.includes('_') && (a == b.split('_')[0])) ? -1 : 0;
	});	

	return entries;
}


/**
 * Преобразует массив классов в объект с вложенной структурой, соответствующей БЭМ-иерархии.
 *
 * @param {Entries} entries Входные данные с классами и атрибутами.
 * @param {Options} options Настройки инструмента.
 * @returns {Object} Объект с БЭМ-структурой.
 */

const toJSON = (entries, options) => {
	let bemjson = {};
	let blockname = '';
	let omit = new RegExp(`^(${options.omit.replace(/\s*/g, '').replace(/,/g, '|')}).*?`);
	let use = new RegExp(`^(${options.use.replace(/\s*/g, '').replace(/,/g, '|')}).*?`);

	// наполняю bemjson
	entries.classes.forEach((item) => {
		// если имя класса есть в списке исключений - пропускаю
		if(!item.match(use) || item.match(omit)) return;

		// если нет _ - блок
		if (!item.includes('_') && !item.includes('-js')) {
			blockname = item;
			bemjson[blockname] = {'mods':'','elems':{}};
		}
		
		// если есть блок-js - создать js файл с именем блока
		if (entries.attrs.includes(`${blockname}-js`) || item.includes(`${blockname}-js`)) {
			bemjson[blockname]['js'] = true;
		}

		// если только один _ - модификатор блока
		if ((item.match(/_/g) || []).length == 1) {
			item = item.replace(blockname+'_', '');
			bemjson[blockname]['mods'] += (item + ',');
		}

		// если есть blockname__ - элемент или его модификатор
		if (item.includes(blockname+'__')) {
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


/**
 * Создает в заданной директории файловую структуру для SCSS-файлов на основе полученной БЭМ-структуры.
 *
 * @param {Object} bemjson Объект с БЭМ-структурой.
 * @param {Options} options Настройки инструмента.
 */

const createStucture = (bemjson, options) => {
	const jsImportsContent = options.js && readFileContents(path.join(options.cwd, options.js));
	let jsImportPath = path.posix.relative(path.dirname(options.js), options.to);
	let imports = [];

	for (const blockName in bemjson) {
		const dirPath = path.join(options.cwd, options.to, blockName);
		const filePath = path.join(dirPath, `${blockName}.scss`);
		const prefix = options.prefix && `${options.prefix}\n\n`;
		const suffix = options.prefix && `${options.suffix}\n`;
		const block = bemjson[blockName];
		let fileContent = `${prefix}.${blockName} {\n\t${suffix}\n`;

		if (isFileExist(filePath) === false) {
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
			createFile(path.join(dirPath, `${blockName}.js`), `(() => {\n\n\n})();\n`);
			
			if (!jsImportsContent.includes(`${blockName}.js`)) {
				imports.push(`import "${jsImportPath}/${blockName}/${blockName}.js";`);
				console.log(`File prepare to import: ${blockName}.js`);
			}
		}
		fileContent += `}\n`;
		
		createFile(filePath, fileContent);
	}

	if(options.js && imports.length) {
		addImportJS(options, imports);
	}
}


/**
 * Проверяет существование файла.
 *
 * @param {string} filePath Путь к файлу.
 * @returns {boolean} True, если файл существует, иначе false.
 */

const isFileExist = (filePath) => {
	try {
		fs.statSync(filePath);
	} catch (err) {
		return !(err && err.code === 'ENOENT');
	}
}
	

/**
 * Читает содержимое файла и возвращает его в виде строки.
 *
 * @param {string} filePath Путь к файлу.
 * @returns {string} Содержимое файла без лишних пробелов в начале и конце.
 */

const readFileContents = (filePath) => {
	try {
		return fs.readFileSync(filePath, 'utf-8').trim();
	} catch (e) {
		return '';
	}
};


/**
 * Создает новый файл с указанным содержимым, если он еще не существует.
 *
 * @param {string} filePath Путь к создаваемому файлу.
 * @param {string} fileContent Содержимое файла.
 */

const createFile = (filePath, fileContent) => {
	if (isFileExist(filePath) === false) {
		fs.writeFile(filePath, fileContent, (err) => {
			if (err) {
				return console.log(`File NOT created: ${err}`);
			}
			console.log('File created: ' + filePath);
		});
	}
}


/**
 * Создает указанный JS-файл если он еще не создан и добавляет 
 * в него импорты, если они ещё не были добавлены.
 *
 * @param {Options} options Настройки инструмента.
 * @param {Array<string>} imports Импорты, которые нужно добавить.
 */

const addImportJS = (options, imports) => {
		const lb = require('os').EOL;
		let content = [];

	if (isFileExist(options.js) === false) {
		createFile(path.dirname(path.join(options.cwd, options.js)))
	} else {
		try {
			content = readFileContents(path.join(options.cwd, options.js)).split(lb);
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