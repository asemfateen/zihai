import { Outlet, ScrollRestoration, useNavigate } from "react-router-dom";
import CommandPalette from "./CommandPalette";
import FloatingDock from "./FloatingDock";
import OfflineBanner from "./OfflineBanner";
import AnnouncementBanner from "./AnnouncementBanner";

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-transparent relative z-10 overflow-hidden flex flex-col">
      <AnnouncementBanner />

      {/* Global Dynamic background blobs */}
      <div className="fixed top-0 left-1/4 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-orange-500/5 rounded-full blur-[100px] -z-10 mix-blend-screen pointer-events-none"></div>

      <CommandPalette />
      <ScrollRestoration />

      {/* Global Branding / Home Button - Mobile only */}
      <div className="fixed top-6 left-4 z-50 animate-fade-in md:hidden">
        <button
          onClick={() => navigate("/")}
          className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary via-rose-500 to-orange-500 bg-clip-text text-transparent drop-shadow-sm select-none cursor-pointer bg-transparent border-none p-0"
        >
          字海
        </button>
      </div>

      {/* Main content route */}
      <div className="flex-1 min-h-0 pb-36 md:pb-6 pt-4 md:pt-6 md:pl-64 transition-all duration-300 flex flex-col">
        <div className="max-w-6xl mx-auto w-full flex-1 min-h-0 flex flex-col">
          <Outlet />
        </div>
      </div>

      {/* Global Navigation Shell */}
      <FloatingDock />
      <OfflineBanner />
    </div>
  );
}
