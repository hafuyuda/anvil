import type { Card, CardGroup, CardType, Token } from "../../core/ipc";
import { PickerDialog } from "../../components/PickerDialog";
import { AddFromGroupDialog } from "./AddFromGroupDialog";
import { PileDrawDialog } from "./PileDrawDialog";

interface Props {
  // 背景选择
  bgPickerOpen: boolean;
  imageOptions: { value: string; label: string }[];
  onCloseBg: () => void;
  onPickBg: (v: string) => void;

  // 卡组导入
  addFromGroupOpen: boolean;
  onCloseAddFromGroup: () => void;
  onImportFromGroup: (group: CardGroup, shuffleOn: boolean) => void;

  // 卡盒创建
  addPileOpen: boolean;
  cardGroups: CardGroup[];
  onCloseAddPile: () => void;
  onPickPileGroup: (groupId: string) => void;

  // 卡盒抽牌
  pileDrawTokenId: string | null;
  tokens: Token[];
  onClosePileDraw: () => void;
  onDrawPile: (n: number) => void;
  onShufflePile: () => void;
  onResetPile: () => void;

  // 卡片选择
  cardPickerOpen: boolean;
  cards: Card[];
  cardTypes: CardType[];
  onCloseCardPicker: () => void;
  onPickCard: (cardId: string) => void;
}

export function BoardDialogs({
  bgPickerOpen,
  imageOptions,
  onCloseBg,
  onPickBg,
  addFromGroupOpen,
  onCloseAddFromGroup,
  onImportFromGroup,
  addPileOpen,
  cardGroups,
  onCloseAddPile,
  onPickPileGroup,
  pileDrawTokenId,
  tokens,
  onClosePileDraw,
  onDrawPile,
  onShufflePile,
  onResetPile,
  cardPickerOpen,
  cards,
  cardTypes,
  onCloseCardPicker,
  onPickCard,
}: Props) {
  return (
    <>
      {bgPickerOpen && (
        <PickerDialog
          title="选择背景图"
          options={[{ value: "", label: "— 无背景 —" }, ...imageOptions]}
          onPick={onPickBg}
          onClose={onCloseBg}
        />
      )}

      {addFromGroupOpen && (
        <AddFromGroupDialog
          onClose={onCloseAddFromGroup}
          onImport={onImportFromGroup}
        />
      )}

      {addPileOpen && (
        <PickerDialog
          title="选择卡组（作为卡盒）"
          options={cardGroups.map((g) => ({
            value: g.id,
            label: `${g.name}（${g.card_ids.length} 张）`,
          }))}
          onPick={onPickPileGroup}
          onClose={onCloseAddPile}
        />
      )}

      {pileDrawTokenId &&
        (() => {
          const t = tokens.find((x) => x.id === pileDrawTokenId);
          if (!t?.pile) return null;
          return (
            <PileDrawDialog
              pile={t.pile}
              onDraw={onDrawPile}
              onShuffle={onShufflePile}
              onReset={onResetPile}
              onClose={onClosePileDraw}
            />
          );
        })()}

      {cardPickerOpen && (
        <PickerDialog
          title="添加卡片到棋盘"
          options={cards.map((c) => ({
            value: c.id,
            label: `${c.name} · ${cardTypes.find((t) => t.id === c.type_id)?.name ?? "?"}`,
          }))}
          onPick={onPickCard}
          onClose={onCloseCardPicker}
        />
      )}
    </>
  );
}