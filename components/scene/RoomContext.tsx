"use client";
import { createContext, useContext } from "react";
import { HOME_ROOM_ID, Room } from "@/lib/rooms";

/**
*      — Scene ,   (Cabinet/Album ) .
*  props ({ onClose })       Context.
 */
export interface RoomContextValue {
  room: Room;
/** ( ) — false ( ) */
  isOwnRoom: boolean;
/**    (   ) */
  visitRoom: (roomId: string) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export const RoomProvider = RoomContext.Provider;

/**    . Provider     (  ). */
export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (ctx) return ctx;
  return {
    room: { id: HOME_ROOM_ID, ownerName: "", walletAddress: "", avatarUrl: "" },
    isOwnRoom: true,
    visitRoom: () => {},
  };
}
