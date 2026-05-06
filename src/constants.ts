import { SystemInfo } from "./types";

export const SYSTEM_MAP: SystemInfo[] = [
  {
    name: "Nintendo - Super Nintendo Entertainment System",
    systemeid: 4,
    extensions: [".sfc", ".smc", ".fig", ".swc", ".bs", ".st"],
  },
  {
    name: "Nintendo - Game Boy Advance",
    systemeid: 12,
    extensions: [".gba", ".srl", ".agb"],
  },
  {
    name: "Nintendo - Nintendo Entertainment System",
    systemeid: 3,
    extensions: [".nes", ".unf", ".unif", ".fds"],
  },
  {
    name: "Sega - Mega Drive - Genesis",
    systemeid: 1,
    extensions: [".md", ".gen", ".smd", ".bin"],
  },
  {
    name: "Sega - Master System",
    systemeid: 2,
    extensions: [".sms"],
  },
  {
    name: "Sega - Game Gear",
    systemeid: 20,
    extensions: [".gg"],
  },
  {
    name: "Nintendo - Game Boy",
    systemeid: 9,
    extensions: [".gb"],
  },
  {
    name: "Nintendo - Game Boy Color",
    systemeid: 10,
    extensions: [".gbc"],
  },
  {
    name: "Nintendo - Nintendo 64",
    systemeid: 14,
    extensions: [".n64", ".z64", ".v64"],
  },
  {
    name: "Nintendo - Virtual Boy",
    systemeid: 11,
    extensions: [".vb"],
  },
  {
    name: "Sony - PlayStation",
    systemeid: 57,
    extensions: [".cue", ".iso", ".bin", ".img", ".chd"],
  },
  // Thêm các hệ máy khác nếu cần
];

export const DEFAULT_DELAY_MS = 1000;
export const IMAGE_TYPES = ["image", "thumbnail", "marquee"] as const;
export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"];
export const IGNORE_EXTENSIONS = [".txt", ".log", ".xml"];
