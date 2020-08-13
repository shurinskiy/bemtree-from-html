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
	from:'./src/**/!(_|temp)*.html',
	to: 'src/blocks',
	omit: '@@,js-,active,col,row'
});
```
Call from package.json:

```json
"scripts": {
	"bemtree": "bemtree-from-html from=./src/**/!(_%temp)*.html to=src/blocks omit=active,col,row" 
},

> npm run bemtree

```
>
> **`Note!`** Since the node.js console accepts the "|" as the beginning of a new command, in the `"scripts:{}"` section of the `package.json` file, when describing the search template, you must use the "%" symbol instead "|". When called inside the corresponding function, "%" will automatically be replaced with "|"
>
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
<div class="blockname2 blockname2_first blockname1-js">
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
.blockname1 {
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
// (() => {
// code..
// })();
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
#### cwd
Type: string

Current working directory. Default value: `process.cwd()`













