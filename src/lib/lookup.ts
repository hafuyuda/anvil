import type { Card, CardType, Relation, RelationKind } from "../core/ipc";

export function findCardType(
  cardTypes: CardType[],
  typeId: string,
): CardType | undefined {
  return cardTypes.find((t) => t.id === typeId);
}

export function cardTypeName(cardTypes: CardType[], typeId: string): string {
  return findCardType(cardTypes, typeId)?.name ?? typeId.slice(0, 8);
}

export function relationKindName(
  relationKinds: RelationKind[],
  kindId: string,
): string {
  return relationKinds.find((k) => k.id === kindId)?.name ?? kindId;
}

export function cardName(cards: Card[], cardId: string): string {
  return cards.find((c) => c.id === cardId)?.name ?? cardId.slice(0, 8);
}

export function relationLabel(
  relationKinds: RelationKind[],
  relation: Relation,
): string {
  if (relation.label) return relation.label;
  return relationKindName(relationKinds, relation.kind);
}
