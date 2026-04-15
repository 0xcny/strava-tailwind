"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function NotFoundError() {
  const router = useRouter()
  return (
    <div className="flex h-svh items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-8xl font-bold tracking-tighter text-muted-foreground/30">404</h1>
        <h2 className="text-xl font-semibold">Page Not Found</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-4 flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button onClick={() => router.replace("/dashboard")}>Dashboard</Button>
        </div>
      </div>
    </div>
  )
}
