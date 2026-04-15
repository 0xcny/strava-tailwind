"use client"

import { login } from "@/app/auth/actions/login"
import { Spinner } from "@/components/spinner"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useActionState } from "react"
import { LogInIcon } from "lucide-react"

export function LoginDrawer() {
  const [state, formLogin, isPending] = useActionState<any, FormData>(login, null)
  const inputClass = state ? "border-destructive" : ""

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <LogInIcon className="h-3.5 w-3.5" />
          Log in
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Welcome back</DrawerTitle>
            <DrawerDescription>Sign in to your KomQuest account.</DrawerDescription>
          </DrawerHeader>
          <form className="grid gap-4 p-4" action={formLogin}>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                className={inputClass}
                required
                disabled={isPending}
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                autoCorrect="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                className={inputClass}
                required
                disabled={isPending}
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                autoCorrect="off"
              />
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" disabled={isPending} className="bg-brand text-brand-foreground hover:bg-brand/90">
                {isPending ? (
                  <>
                    Signing in
                    <Spinner size={14} />
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
