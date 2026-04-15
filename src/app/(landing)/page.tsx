import { ContactSection } from "@/features/hero/contact-section"
import { HeroSection } from "@/features/hero/hero-section"
import { LoginDrawer } from "@/features/hero/login-drawer"
import { CrownIcon } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <CrownIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-base font-semibold tracking-tight">KomQuest</span>
          </div>
          <LoginDrawer />
        </div>
      </header>
      <main>
        <HeroSection />
      </main>
      <ContactSection />
    </div>
  )
}
