import { Label } from "@/lib/types/types"
import { TableFilterField } from "./types"

const LABEL_OPTIONS = [
  "Hazardous",
  "Circuit",
  "Curvy",
  "Straight",
  "Climb",
  "Downhill",
  "Overlong",
  "Contested",
  "Uncontested",
] satisfies Label[]

export function createFilterFields<T extends { name: string; labels?: Label[] }>(): TableFilterField<T>[] {
  return [
    {
      label: "Name",
      value: "name" as keyof T,
      placeholder: "Filter names...",
    },
    {
      label: "Labels",
      value: "labels" as keyof T,
      options: LABEL_OPTIONS.map((label) => ({
        label,
        value: label,
      })),
    },
  ]
}
