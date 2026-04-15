import * as React from "react"

import { verifySession } from "@/app/auth/actions/verify-session"
import pb from "@/lib/pocketbase"
import { SearchParams } from "@/features/tables/_lib/types"
import { searchParamsSchema } from "@/features/tables/_lib/validations"
import { getDeltaSegments } from "@/features/tables/delta/server/queries"
import { DeltaTable } from "@/features/tables/delta/delta-table"
import { CustomTableSkeleton } from "@/components/table/table-skeleton"

export interface DeltaPageProps {
  searchParams: Promise<SearchParams>
}

export default async function DeltaPage({ searchParams }: DeltaPageProps) {
  const session = await verifySession()
  pb.authStore.save(session.pbAuth!)

  const awaitedParams = await searchParams
  const search = searchParamsSchema.parse(awaitedParams)

  const dataPromise = getDeltaSegments(search)

  return (
    <div className="p-4 lg:p-6">
      <React.Suspense
        fallback={
          <CustomTableSkeleton
            columnCount={5}
            searchableColumnCount={1}
            filterableColumnCount={2}
            cellWidths={["10rem", "40rem", "12rem", "12rem", "8rem"]}
            shrinkZero
          />
        }
      >
        <DeltaTable dataPromise={dataPromise} />
      </React.Suspense>
    </div>
  )
}
