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
  'Dimension',
  'Operator',
  'Value',
  'Identifier',
  'Function',
  'Percentage',
  'String',
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
  const keyframes = {};

  for (const c of ast.children) {
    if (c.type == 'Atrule') {
      switch(c.name) {
        case 'keyframes':
          if (keyframes[c.name]) {
            throw new Error(`Overriding keyframes. ${csstree.generate(keyframes[c.name])} vs ${csstree.generate(c)}`);
          }
          const id = csstree.find(c, (node, item, list) => {
            return node.type == 'Identifier';
          });
          keyframes[id.name] = c;
          continue;
        default:
          console.warn(`Skipping at rule: `, csstree.generate(c));
          continue;
      }
    }

    const selector = csstree.find(c, (node, item, list) => {
      return node.type == 'ClassSelector' || node.type == 'PseudoClassSelector' || node.type == 'TypeSelector';
    });
    if (!selector) {
      console.warn('--------------------------------------------------');
      console.warn(`Unexpected rule: `, csstree.generate(c));
      csstree.walk(c, (node) => {
        if (ignoreType(node)) {
          return;
        }
        console.log(node);
      })
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

  const keyframeNames = Object.keys(keyframes);

  for (const [filename, rules] of Object.entries(files)) {
    const strings = [];
    for (const r of rules) {
      strings.push(csstree.generate(r));

      if (filename == 'drac-bg-animated') {
        csstree.walk(r, (node, item, list) => {
          if (node.type == 'Identifier') {
            const name = node.name;
            if(keyframeNames.indexOf(name) != -1) {
              strings.push(csstree.generate(keyframes[name]));
            }
          }
          return false
        });
      }
    }

    const fp = path.join(cli.flags.outputdir, `${filename}.css`);
    await writeFile(fp, strings.join("\n"));
  }
}

run();
