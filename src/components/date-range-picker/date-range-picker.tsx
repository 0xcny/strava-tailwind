"use client"

import React, { type FC, useState, useEffect, useRef, JSX } from "react"
import { DateInput } from "./date-input"
import { ChevronUpIcon, ChevronDownIcon, CheckIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Button } from "../ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Calendar } from "../ui/calendar"
import { DateRange } from "./types"
import { areRangesEqual, formatDate, getDateAdjustedForTimezone } from "./utils"
import { getPresetRange, PRESETS } from "./get-presets"

export interface DateRangePickerProps {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate: (range: DateRange) => void
  /** Initial value for start date */
  initialRange?: DateRange
  /** Alignment of popover */
  align?: "start" | "center" | "end"
  /** Option for locale */
  locale?: string
}

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker: FC<DateRangePickerProps> = ({
  initialRange,
  onUpdate,
  align = "end",
  locale = "en-US",
}): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  const initRange = getPresetRange("last7")
  const [tempRange, setTempRange] = useState<DateRange>({
    from: getDateAdjustedForTimezone(initRange.from),
    to: getDateAdjustedForTimezone(initRange.to!),
  })

  const [range, setRange] = useState<DateRange>(tempRange)

  // Refs to store the values of range and rangeCompare when the date picker is opened
  const openedRangeRef = useRef<DateRange | undefined>(undefined)

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)

  const [isSmallScreen, setIsSmallScreen] = useState(typeof window !== "undefined" ? window.innerWidth < 960 : false)

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960)
    }

    window.addEventListener("resize", handleResize)

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset)
    setTempRange(range)
  }

  const checkPreset = (): void => {
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name)

      const normalizedRangeFrom = new Date(tempRange.from)
      normalizedRangeFrom.setHours(0, 0, 0, 0)
      const normalizedPresetFrom = new Date(presetRange.from.setHours(0, 0, 0, 0))

      const normalizedRangeTo = new Date(tempRange.to ?? 0)
      normalizedRangeTo.setHours(0, 0, 0, 0)
      const normalizedPresetTo = new Date(presetRange.to?.setHours(0, 0, 0, 0) ?? 0)

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name)
        return
      }
    }

    setSelectedPreset(undefined)
  }

  const resetValues = (): void => {
    setTempRange(range)
  }

  useEffect(() => {
    checkPreset()
  }, [tempRange])

  const PresetButton = ({
    preset,
    label,
    isSelected,
  }: {
    preset: string
    label: string
    isSelected: boolean
  }): JSX.Element => (
    <Button
      className={cn(isSelected && "pointer-events-none")}
      variant="ghost"
      onClick={() => {
        setPreset(preset)
      }}
    >
      <>
        <span className={cn("pr-2 opacity-0", isSelected && "opacity-70")}>
          <CheckIcon width={18} height={18} />
        </span>
        {label}
      </>
    </Button>
  )

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = tempRange
    }
  }, [isOpen])

  return (
    <Popover
      modal={true}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetValues()
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <div className="text-right">
            <div className="py-1">
              <div>{`${formatDate(range.from, locale)}${
                range.to != null ? " - " + formatDate(range.to, locale) : ""
              }`}</div>
            </div>
          </div>
          <div className="pl-1 opacity-60 -mr-2 scale-125">
            {isOpen ? <ChevronUpIcon width={24} /> : <ChevronDownIcon width={24} />}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto">
        <div className="flex py-2">
          <div className="flex flex-col">
            <div className="flex flex-col lg:flex-row gap-2 px-3 justify-end items-center lg:items-start pb-4 lg:pb-0">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <DateInput
                    value={tempRange.from}
                    onChange={(date) => {
                      const toDate = tempRange.to == null || date > tempRange.to ? date : tempRange.to
                      setTempRange((prevRange) => ({
                        ...prevRange,
                        from: date,
                        to: toDate,
                      }))
                    }}
                  />
                  <div className="py-1">-</div>
                  <DateInput
                    value={tempRange.to}
                    onChange={(date) => {
                      const fromDate = date < tempRange.from ? date : tempRange.from
                      setTempRange((prevRange) => ({
                        ...prevRange,
                        from: fromDate,
                        to: date,
                      }))
                    }}
                  />
                </div>
              </div>
            </div>
            {isSmallScreen && (
              <Select
                defaultValue={selectedPreset}
                onValueChange={(value) => {
                  setPreset(value)
                }}
              >
                <SelectTrigger className="w-[180px] mx-auto mb-2">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div>
              <Calendar
                mode="range"
                onSelect={(value: { from?: Date; to?: Date } | undefined) => {
                  if (value?.from != null) {
                    setTempRange({ from: value.from, to: value?.to })
                  }
                }}
                selected={tempRange}
                numberOfMonths={isSmallScreen ? 1 : 2}
                defaultMonth={new Date(new Date().setMonth(new Date().getMonth() - (isSmallScreen ? 0 : 1)))}
              />
            </div>
          </div>
          {!isSmallScreen && (
            <div className="flex flex-col items-end gap-1 pr-2 pl-6 pb-6">
              <div className="flex w-full flex-col items-end gap-1 pr-2 pl-6 pb-6">
                {PRESETS.map((preset) => (
                  <PresetButton
                    key={preset.name}
                    preset={preset.name}
                    label={preset.label}
                    isSelected={selectedPreset === preset.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 py-2 pr-4">
          <Button
            onClick={() => {
              setIsOpen(false)
              resetValues()
            }}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setIsOpen(false)
              if (!areRangesEqual(tempRange, openedRangeRef.current)) {
                setRange(tempRange)
                onUpdate(tempRange)
              }
            }}
          >
            Update
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
