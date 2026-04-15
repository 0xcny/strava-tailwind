"use client"

import { useActionState } from "react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MailCheckIcon, MailWarningIcon, SendIcon, CrownIcon } from "lucide-react"
import Link from "next/link"
import { sendEmail } from "./server/contact-email"
import { Spinner } from "@/components/spinner"

const formSchema = z.object({
  name: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

type FormState = {
  success?: boolean
  message?: string
  error?: string
  errors?: Record<string, string[]>
  values?: { name: string; email: string; message: string } | null
} | null

export function ContactSection() {
  const currentYear = new Date().getFullYear()

  const [state, formAction, isPending] = useActionState<FormState, FormData>(async (prevState, formData) => {
    const formValues = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    }

    try {
      const validated = formSchema.parse(formValues)
      await sendEmail({ email: validated.email, username: validated.name, text: validated.message })
      return { success: true, message: "Message sent successfully!", values: null }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { errors: error.flatten().fieldErrors, values: formValues }
      }
      return { error: "Failed to send message", values: formValues }
    }
  }, null)

  return (
    <footer id="contact" className="border-t">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                <CrownIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-base font-semibold">KomQuest</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Analytics for competitive cyclists who want to track, analyze, and defend their Strava KOMs.
            </p>
            <nav className="flex flex-col gap-1.5 text-sm">
              {["Privacy Policy", "Terms of Service", "About"].map((label) => (
                <Link
                  key={label}
                  href={`/${label.toLowerCase().replace(/ /g, "-")}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-muted-foreground">&copy; {currentYear} KomQuest</p>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-base font-semibold">Request Access</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Currently invite-only. Leave your details and we'll get you set up.
            </p>
            <form action={formAction} className="mt-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Input name="name" placeholder="Strava username" defaultValue={state?.values?.name || ""} />
                  {state?.errors?.name && <p className="mt-1 text-xs text-destructive">{state.errors.name[0]}</p>}
                </div>
                <div>
                  <Input name="email" type="email" placeholder="Email" defaultValue={state?.values?.email || ""} />
                  {state?.errors?.email && <p className="mt-1 text-xs text-destructive">{state.errors.email[0]}</p>}
                </div>
              </div>
              <div>
                <Textarea
                  name="message"
                  placeholder="How do you plan to use KomQuest?"
                  className="min-h-[100px] resize-none"
                  defaultValue={state?.values?.message || ""}
                />
                {state?.errors?.message && <p className="mt-1 text-xs text-destructive">{state.errors.message[0]}</p>}
              </div>

              {isPending ? (
                <Button disabled size="sm">Sending <Spinner size={14} /></Button>
              ) : state?.success ? (
                <div className="inline-flex h-8 items-center gap-1.5 rounded-md border border-success/50 bg-success/10 px-3 text-sm text-success">
                  <MailCheckIcon className="h-3.5 w-3.5" /> Sent
                </div>
              ) : state?.error ? (
                <div className="inline-flex h-8 items-center gap-1.5 rounded-md border border-destructive/50 bg-destructive/10 px-3 text-sm text-destructive">
                  <MailWarningIcon className="h-3.5 w-3.5" /> Failed
                </div>
              ) : (
                <Button type="submit" size="sm" className="gap-1.5">
                  Send <SendIcon className="h-3 w-3" />
                </Button>
              )}

              {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
            </form>
          </div>
        </div>
      </div>
    </footer>
  )
}
