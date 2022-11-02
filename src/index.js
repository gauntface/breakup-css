import * as csstree from 'css-tree';
import meow from 'meow';
import { readFile } from 'node:fs/promises';
import * as path from 'path';

const cli = meow({
	importMeta: import.meta,
	flags: {
		file: {
			type: 'string',
			isRequired: true,
		}
	}
});

async function run() {
  const fp = cli.flags.file;
  const fb = await readFile(path.resolve(fp));
  const cssString = fb.toString();
  const ast = csstree.parse(cssString);
  csstree.walk(ast, (node) => {
    if (node.type == 'ClassSelector') {
      console.log(node.type, node.name);
    } else {
      console.log(`    ${node.type}`);
    }
});
}

run();
