import * as csstree from 'css-tree';
import meow from 'meow';
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'path';

const cli = meow({
	importMeta: import.meta,
	flags: {
		file: {
			type: 'string',
			isRequired: true,
		},
    outputdir: {
      type: 'string',
      isRequired: true,
    }
	}
});

const IGNORE_NODE_TYPES = [
  'Raw',
  'Declaration',
];
function ignoreType(node) {
  return IGNORE_NODE_TYPES.indexOf(node.type) >= 0;
}

async function run() {
  const fp = cli.flags.file;
  const fb = await readFile(path.resolve(fp));
  const cssString = fb.toString();
  const ast = csstree.parse(cssString);

  const files = {};

  let i = 0;
  let max = -1;
  for (const c of ast.children) {
    if (c.type == 'Atrule') {
      console.warn(`Skipping at rule: `, csstree.generate(c));
      continue;
    }

    i++;
    if (max != -1 && i > max) {
      break;
    }
    
    const selector = csstree.find(c, (node, item, list) => {
      return node.type == 'ClassSelector' || node.type == 'PseudoClassSelector';
    });
    if (!selector) {
      console.warn(`Possibly wonky? `, csstree.generate(c));
      /* csstree.walk(c, (node) => {
        if (ignoreType(node)) {
          return;
        }
        console.log(node);
      })*/
      continue;
    }

    let filename = selector.name;
    if (filename == 'root') {
      filename = '_variables';
    }

    if (!files[filename]) {
      files[filename] = [];
    }
    files[filename].push(c);
  }

  for (const [filename, rules] of Object.entries(files)) {
    const strings = [];
    for (const r of rules) {
      strings.push(csstree.generate(r));
    }
    const fp = path.join(cli.flags.outputdir, `${filename}.css`);
    await writeFile(fp, strings.join("\n"));
  }
  
  /* csstree.walk(ast, (node) => {
    if (node.type == 'ClassSelector') {
      console.log(node.type, node.name);
    } else {
      console.log(`    ${node.type}`);
    }
  });*/
}

run();
