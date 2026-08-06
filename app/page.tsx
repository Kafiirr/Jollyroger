import { Scene } from "@/components/scene/Scene";
import { DesktopOnlyGuard } from "@/components/scene/DesktopOnlyGuard";

export default function Home() {
  return (
    <DesktopOnlyGuard>
      <Scene />
    </DesktopOnlyGuard>
  );
}

