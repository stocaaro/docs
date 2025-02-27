import { writeFileSync, readFileSync } from 'fs';
import { packageCategories } from '../src/data/api-categories.mjs';
import { processReferences } from '../src/data/process-typedoc.mjs';

/**
 * Read the -p flag from the cli params
 *
 * This flag tells is which package is adjacent with a references file to read from
 * eg. `-p amplify-js` means that `../amplify-js/docs/reference.json` exists and is
 *   ready to be transformed into `src/directory/apiReferences/amplify-js.json`
 */
const packageIndex = process.argv.indexOf('-p');

if (packageIndex === -1) {
  throw new Error(
    'No package name provided please provide a package name in -p.'
  );
}

const packageName = process.argv[packageIndex + 1];

const referencesFile = readFileSync(`../${packageName}/docs/reference.json`);

const { API_CATEGORIES, API_SUB_CATEGORIES, ROOT_PACKAGE } =
  packageCategories[packageName];

const references = processReferences(JSON.parse(referencesFile), ROOT_PACKAGE);
const cleanReferences = {};
const categoryNodes = [];

function recursivelyPopulateNodes(node) {
  /**
   * Ids to look for and populate are
   * target
   * type
   * typeArguments[]
   * types[]
   * declaration->children[]
   * elementType -> target
   * children[]
   * signatures[]
   * parameters[]
   *
   * The above list are the ids that are looked for within each node, if any of these ids
   * are found then the node is added to cleanReferences and the newly found node is traversed.
   */
  if (!node) return;

  // add the current node to cleanReferences
  if (node.id) {
    if (cleanReferences.hasOwnProperty(node.id)) return;
    cleanReferences[node.id] = node;
  }

  // populate "target"
  if (node.target && typeof node.target === 'number') {
    recursivelyPopulateNodes(references[node.target]);
  }

  // populate "type"
  if (node.type) {
    if (typeof node.type === 'number') {
      const nextNode = references[node.type];
      recursivelyPopulateNodes(nextNode);
    } else if (typeof node.type === 'object') {
      recursivelyPopulateNodes(node.type);
    }
  }

  // populate "typeArguments"
  if (node.typeArguments && Array.isArray(node.typeArguments)) {
    node.typeArguments.forEach((arg) => {
      if (typeof arg === 'number') {
        recursivelyPopulateNodes(references[arg]);
      } else if (typeof arg === 'object' && arg !== null) {
        recursivelyPopulateNodes(arg);
      }
    });
  }

  // populate "types"
  if (node.types && Array.isArray(node.types)) {
    node.types.forEach((arg) => {
      if (typeof arg === 'number') {
        recursivelyPopulateNodes(references[arg]);
      } else if (typeof arg === 'object' && arg !== null) {
        recursivelyPopulateNodes(arg);
      }
    });
  }

  // populate "declaration.children"
  if (
    node.declaration &&
    node.declaration.children &&
    Array.isArray(node.declaration.children)
  ) {
    node.declaration.children.forEach((arg) => {
      if (typeof arg === 'number') {
        recursivelyPopulateNodes(references[arg]);
      } else if (typeof arg === 'object' && arg !== null) {
        recursivelyPopulateNodes(arg);
      }
    });
  }

  // populate "elementType"
  if (node.elementType && node.elementType.target) {
    const elemType = node.elementType.target;
    if (typeof elemType === 'number') {
      recursivelyPopulateNodes(references[elemType]);
    } else if (typeof elemType === 'object' && elemType !== null) {
      recursivelyPopulateNodes(elemType);
    }
  }

  // populate "children"
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((arg) => {
      if (typeof arg === 'number') {
        recursivelyPopulateNodes(references[arg]);
      } else if (typeof arg === 'object' && arg !== null) {
        recursivelyPopulateNodes(arg);
      }
    });
  }

  // populate "signatures"
  if (node.signatures && Array.isArray(node.signatures)) {
    node.signatures.forEach((arg) => {
      if (typeof arg === 'number') {
        recursivelyPopulateNodes(references[arg]);
      } else if (typeof arg === 'object' && arg !== null) {
        recursivelyPopulateNodes(arg);
      }
    });
  }

  // populate "parameters"
  if (node.parameters && Array.isArray(node.parameters)) {
    node.parameters.forEach((arg) => {
      if (typeof arg === 'number') {
        recursivelyPopulateNodes(references[arg]);
      } else if (typeof arg === 'object' && arg !== null) {
        recursivelyPopulateNodes(arg);
      }
    });
  }
}

const categories = Object.values(API_CATEGORIES).concat(
  Object.values(API_SUB_CATEGORIES)
);

// iterate over all categories and populate all nodes
categories.forEach((catName) => {
  const catNode = references.categories?.filter((cat) => {
    return cat.name === catName;
  })[0];

  if (catNode) {
    categoryNodes.push(catNode);
    recursivelyPopulateNodes(catNode);
  }
});

cleanReferences['categories'] = categoryNodes;

// write the cleaned references object, this will happen as part of the
// update_references workflow and will be committed.
try {
  writeFileSync(
    `src/directory/apiReferences/${packageName}.json`,
    JSON.stringify(cleanReferences, null, 2),
    'utf8'
  );
  console.log('Data successfully saved to disk');
} catch (error) {
  console.log('An error has occurred ', error);
}
