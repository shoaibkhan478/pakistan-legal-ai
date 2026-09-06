const { Document, Packer } = require("docx");
const C = require("./templates/common");
const registry = require("./templates/registry");

/**
 * generateDraft(type, data) -> Buffer (docx)
 *
 * `type` selects which layout + schema to use.
 * `data` is the STRUCTURED JSON Claude should return for that type
 * (see the `schema` export in each template file — feed that schema
 * straight into your Claude prompt as the required response shape).
 */
async function generateDraft(type, data) {
  const tpl = registry[type];
  if (!tpl) {
    throw new Error(`Unknown draft type: "${type}". Available: ${Object.keys(registry).join(", ")}`);
  }
  const doc = new Document({
    sections: [{ properties: C.pageSetup, children: tpl.render(data) }],
  });
  return Packer.toBuffer(doc);
}

function getSchema(type) {
  const tpl = registry[type];
  if (!tpl) throw new Error(`Unknown draft type: "${type}"`);
  return tpl.schema;
}

module.exports = { generateDraft, getSchema, availableTypes: Object.keys(registry) };
