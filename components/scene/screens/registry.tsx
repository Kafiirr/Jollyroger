import { ComponentType } from "react";
import { SpotId } from "@/lib/spots";
import { CabinetScreen } from "./CabinetScreen";
import { ComputerScreen } from "./ComputerScreen";
import { PhotoScreen } from "./PhotoScreen";
import { AlbumScreen } from "./AlbumScreen";
import { NoteScreen } from "./NoteScreen";
import { EscrowScreen } from "./EscrowScreen";
import { LedgerScreen } from "./LedgerScreen";

export type ScreenComponent = ComponentType<{ onClose: () => void }>;

/**
* () →   .
*    =        (append-only,  ).
* ⚠️   Scene.tsx / spots.ts    .
 */
export const SCREENS: Partial<Record<SpotId, ScreenComponent>> = {
  cabinet: CabinetScreen,
  computer: ComputerScreen,
  photo: PhotoScreen,
  album: AlbumScreen,
  note: NoteScreen,
  snack: EscrowScreen,
  ledger: LedgerScreen,
};
