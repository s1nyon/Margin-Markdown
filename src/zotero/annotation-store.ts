import { isSupportedType, parsePosition } from "../core/annotation-model";
import type { MarginAnnotation } from "../core/types";

export class AnnotationStore {
  list(attachmentID: number): MarginAnnotation[] {
    const attachment = (Zotero.Items as any).get(attachmentID);
    if (!attachment || typeof attachment.getAnnotations !== "function") return [];

    return attachment
      .getAnnotations(false)
      .map((item: any) => this.toMarginAnnotation(item))
      .filter((item: MarginAnnotation | undefined): item is MarginAnnotation => !!item);
  }

  async saveComment(itemID: number, value: string): Promise<void> {
    const item = (Zotero.Items as any).get(itemID);
    if (!item?.isAnnotation?.()) {
      throw new Error("批注已经不存在");
    }
    if (item.isEditable?.() === false) {
      throw new Error("此批注为只读，无法编辑");
    }

    item.annotationComment = value;
    await item.saveTx();
  }

  private toMarginAnnotation(item: any): MarginAnnotation | undefined {
    if (!item?.isAnnotation?.() || !isSupportedType(item.annotationType)) {
      return undefined;
    }
    const position = parsePosition(item.annotationPosition);
    if (!position) return undefined;

    return {
      itemID: Number(item.id),
      key: String(item.key),
      type: item.annotationType,
      comment: String(item.annotationComment ?? ""),
      color: normalizeColor(item.annotationColor),
      pageLabel: String(item.annotationPageLabel ?? position.pageIndex + 1),
      position,
      readOnly: item.isEditable?.() === false,
    };
  }
}

function normalizeColor(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : "#ffd400";
}
