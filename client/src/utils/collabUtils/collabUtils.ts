
import { BlockNoteEditor, type BlockSchema, type InlineContentSchema,type StyleSchema, type
    PartialBlock,type Block
 } from "@blocknote/core";
import * as Y from "yjs";

export function blocksToYDoc<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  blocks: PartialBlock<BSchema, ISchema, SSchema>[],
  xmlFragment?: string,
): Y.Doc {
  throw new Error("Not implemented");
}


export function blocksToYXmlFragment<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  blocks: Block<BSchema, ISchema, SSchema>[],
  xmlFragment?: Y.XmlFragment,
): Y.XmlFragment {
  throw new Error("Not implemented");
}