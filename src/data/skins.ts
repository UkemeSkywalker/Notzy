export interface Skin {
  id: string;
  name: string;
  /** Window backdrop behind the app frame. */
  bg: string;
  /** Sidebar panel background. */
  sidebar: string;
  /** Main content panel background. */
  main: string;
}

export const SKINS: Skin[] = [
  {
    id: "mist",
    name: "Mist",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(255,255,255,0.85), transparent 65%), linear-gradient(170deg, #e8ebee 0%, #dde3e6 30%, #c9d3d2 60%, #a9b8b2 85%, #8fa39b 100%)",
    sidebar: "rgba(255,255,255,0.85)",
    main: "rgba(241,242,244,0.95)",
  },
  {
    id: "sage",
    name: "Sage",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(255,255,255,0.75), transparent 65%), linear-gradient(170deg, #e3ece3 0%, #cfdfd0 35%, #a8c4ab 70%, #7fa387 100%)",
    sidebar: "rgba(252,254,252,0.88)",
    main: "rgba(240,245,240,0.95)",
  },
  {
    id: "ocean",
    name: "Ocean",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(255,255,255,0.75), transparent 65%), linear-gradient(170deg, #dfeaf2 0%, #c4d9ea 35%, #92b6d5 70%, #5f89b0 100%)",
    sidebar: "rgba(251,253,255,0.88)",
    main: "rgba(240,244,248,0.95)",
  },
  {
    id: "sunset",
    name: "Sunset",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(255,251,240,0.8), transparent 65%), linear-gradient(170deg, #fbe8d7 0%, #f6cfae 35%, #eba07c 70%, #c96f63 100%)",
    sidebar: "rgba(255,253,250,0.88)",
    main: "rgba(250,244,238,0.95)",
  },
  {
    id: "lavender",
    name: "Lavender",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(255,255,255,0.8), transparent 65%), linear-gradient(170deg, #eae6f4 0%, #d8cfec 35%, #b3a3d8 70%, #8672b4 100%)",
    sidebar: "rgba(253,252,255,0.88)",
    main: "rgba(244,242,249,0.95)",
  },
  {
    id: "rose",
    name: "Rose",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(255,252,253,0.8), transparent 65%), linear-gradient(170deg, #f7e4ea 0%, #f0c6d4 35%, #dd93ac 70%, #b2607f 100%)",
    sidebar: "rgba(255,252,253,0.88)",
    main: "rgba(249,242,245,0.95)",
  },
  {
    id: "sand",
    name: "Sand",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(255,253,248,0.8), transparent 65%), linear-gradient(170deg, #f0e9dc 0%, #e4d6bf 35%, #cbb38c 70%, #a38a62 100%)",
    sidebar: "rgba(255,254,250,0.88)",
    main: "rgba(247,243,236,0.95)",
  },
  {
    id: "forest",
    name: "Forest",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(235,244,236,0.55), transparent 65%), linear-gradient(170deg, #b7c9b6 0%, #8aa78c 35%, #5c7f63 70%, #35513f 100%)",
    sidebar: "rgba(250,253,250,0.9)",
    main: "rgba(240,244,240,0.95)",
  },
  {
    id: "graphite",
    name: "Graphite",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(255,255,255,0.25), transparent 65%), linear-gradient(170deg, #9aa1a8 0%, #7b838c 35%, #565e68 70%, #343b44 100%)",
    sidebar: "rgba(250,251,252,0.92)",
    main: "rgba(240,241,243,0.96)",
  },
  {
    id: "midnight",
    name: "Midnight",
    bg: "radial-gradient(ellipse 90% 70% at 25% 0%, rgba(147,167,204,0.35), transparent 65%), linear-gradient(170deg, #6b7a99 0%, #4a5878 35%, #2e3a57 70%, #16203a 100%)",
    sidebar: "rgba(249,250,253,0.93)",
    main: "rgba(239,241,246,0.96)",
  },
];

export function getSkin(id: string | undefined): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
