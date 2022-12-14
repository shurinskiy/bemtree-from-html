# bemtree-from-html [![npm version](https://badge.fury.io/js/bemtree-from-html.svg)](http://badge.fury.io/js/bemtree-from-html)

This module is able to find html files for a given search template, inside your project. Analyze them and build on their basis a file BEM structure for SCSS.

# Install
```
npm install bemtree-from-html --save-dev
```
# Basic Usage

Call from file:

```javascript
let bemtree = require("bemtree-from-html");

bemtree({
	from:'src/**/!(_|temp)*.html',
	to:'src/blocks',
	js:'src/js/blocks.js',
	omit:'@@,js-,active,col,row'
});
```
<br>

Call from package.json:

```json
"scripts": {
	"bemtree": "bemtree-from-html from=./src/**/!(_%temp)*.html to=src/blocks js=src/js/blocks.js omit=active,col,row" 
},

> npm run bemtree

```
>
> **`Note!`** Since the node.js console accepts the "|" as the beginning of a new command, in the `"scripts:{}"` section of the `package.json` file, when describing the search template, you must use the "%" symbol instead "|". When called inside the corresponding function, "%" will automatically be replaced with "|"
>
<br>

Call from package.json, use settings object:

```json
"scripts": {
	"bemtree": "bemtree-from-html" 
},
"bemtree": {
	"from":"./src/**/!(_|temp)*.html",
	"to":"src/blocks",
	"js":"src/js/blocks.js",
	"omit":"@@,js-,active,col,row"
}

> npm run bemtree

```
source html:
```html
<div class="blockname1 blockname1_top">
	<div class="blockname1__item blockname1__item_first"></div>
	<div class="blockname1__item"></div>
	<div class="blockname1__item blockname1__item_last"></div>
</div>
<div class="blockname1 blockname1_bottom">
	<div class="blockname1__item blockname1__item_first"></div>
	<div class="blockname1__item"></div>
	<div class="blockname1__item blockname1__item_last"></div>
</div>
<div class="blockname2 blockname2_first">
	<div class="blockname2__item blockname2__item_first"></div>
	<div class="blockname2__item"></div>
	<div class="blockname2__item blockname2__item_last"></div>
</div>
```
resulting file structure:
```
src
└── blocks
	└── blockname1
		└── blockname1.scss
	└── blockname2
		├── blockname2.scss
		└── blockname2.js
└── js
	└── blocks.js
```
BEM structure inside created files:

blockname1.scss:
```scss
.blockname1 {
	$self: &;

	&_top {
		
	}

	&_bottom {
		
	}

	&__item {

		&_first {
			
		}

		&_last {
			
		}
	}
}
```
blockname2.scss:
```scss
.blockname2 {
	$self: &;

	&_first {
		
	}

	&__item {

		&_first {
			
		}

		&_last {
			
		}
	}
}
```
blockname2.js:
```javascript
(() => {
	//your code..
})();
```
blockname2.js write import to src/js/blocks.js
```javascript
import "../blocks/blockname2/blockname2.js";
```


# Options

#### from
Type: string

Where to find html files is determined by the search template for minimatch. Default value: `./src/**/*.html` See [examples](https://github.com/motemen/minimatch-cheat-sheet/blob/master/README.md).
#### to
Type: string

Where to create the resulting BEM structure. Default value: `src/blocks`
#### omit
Type: string

A comma-separated list of class name exceptions. If the class name begins with one of the values from this list, it will be ignored.
#### use
Type: string

A comma-separated list of classes name prefix required to use. If it is not empty, then ONLY classes with those names will be used. 
> **`Note!`** The 'omit' option, in this case, loses its meaning, but continues to be taken into account.<br>
>

#### js
Type: string

In which file to write .js-file imports for newly created BEM blocks
#### cwd
Type: string

Current working directory. Default value: `process.cwd()`

<br>

> **`Note!`** It is very convenient to use it together with the [gulp-sass-glob](https://github.com/mikevercoelen/gulp-sass-glob) utility. This utility allows you to automatically include all scss files from the blocks folder into any target scss file. Like this: <br>
@import "../blocks/**/*.scss"; <br>
**`Note!`** Now, also, a feature has been added that allows, when creating a block containing a .js file, to automatically write its import to the file specified in the settings. This file contains all the imports, then it is convenient to import it into the main .js file of the project.
>









