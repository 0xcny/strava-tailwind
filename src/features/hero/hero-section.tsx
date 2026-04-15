import { Button } from "@/components/ui/button"
import { ArrowRightIcon, CrownIcon, WindIcon, BarChart3Icon, ShieldCheckIcon } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Mockup, MockupFrame } from "./components/mockup"
import { Glow } from "./components/glow"
import { Icons } from "@/components/icons"

export function HeroSection() {
  const githubUrl = "https://github.com/xspooky7/strava-tailwind/"
  const imageSrc = "/images/hero-preview.png"

  return (
    <section className="relative overflow-hidden pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6 pt-28 sm:pt-36 lg:pt-44">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="inline-flex animate-appear items-center gap-2 rounded-full border bg-card px-3 py-1 text-[13px] text-muted-foreground shadow-sm">
            <CrownIcon className="h-3 w-3 text-brand" />
            Now tracking 4,000+ KOMs
          </div>

          <h1 className="max-w-3xl animate-appear text-balance text-4xl font-bold tracking-tight opacity-0 delay-100 sm:text-5xl lg:text-6xl">
            The command center for your Strava KOMs
          </h1>

          <p className="max-w-xl animate-appear text-balance text-base leading-relaxed text-muted-foreground opacity-0 delay-300 sm:text-lg">
            Know the moment you lose a crown. See who took it. Use real-time
            wind data to plan when to take it back.
          </p>

          <div className="flex animate-appear gap-3 opacity-0 delay-300">
            <Button size="lg" asChild>
              <a href="#contact" className="gap-2">
                Request Access
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href={githubUrl} className="gap-2">
                <Icons.gitHub className="h-4 w-4" />
                Source
              </a>
            </Button>
          </div>
        </div>

        <div className="animate-appear opacity-0 delay-500">
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {[
              { icon: CrownIcon, label: "KOM Tracking", desc: "Gain & loss monitoring" },
              { icon: WindIcon, label: "Tailwind", desc: "Live wind analysis" },
              { icon: BarChart3Icon, label: "Analytics", desc: "Historical trends" },
              { icon: ShieldCheckIcon, label: "Opponents", desc: "Competitor tracking" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative animate-appear opacity-0 delay-700">
          <MockupFrame size="small">
            <Mockup type="responsive">
              <Image src={imageSrc} alt="KomQuest Dashboard" width={1248} height={765} priority />
            </Mockup>
          </MockupFrame>
          <Glow variant="top" className="animate-appear-zoom opacity-0 delay-1000" />
        </div>
      </div>
    </section>
  )
}
