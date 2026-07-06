import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/sidebar";
import { ChatWidget } from "@/components/asistente/chat-widget";
import { getActiveTrack, getBusinessName } from "@/lib/active-track";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ track, enabled }, businessName] = await Promise.all([
    getActiveTrack(),
    getBusinessName(),
  ]);
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        activeTrack={track}
        enabledTracks={enabled}
        businessName={businessName}
      />
      <main className="halftone min-w-0 flex-1 overflow-x-hidden bg-background px-6 py-6 md:px-8">
        {children}
      </main>
      <ChatWidget />
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
