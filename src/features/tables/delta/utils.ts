export function getDeltaSortExpression(column: string | undefined, order: "asc" | "desc" | undefined): string {
  if (column) {
    switch (column) {
      case "status":
        return order === "asc" ? "status" : "-status"
      case "city":
        return order === "asc" ? "kom_effort.segment.city" : "-kom_effort.segment.city"
      case "name":
        return order === "asc" ? "kom_effort.segment.name" : "-kom_effort.segment.name"
      case "terrain":
        return order === "asc" ? "kom_effort.segment.average_grade" : "-kom_effort.segment.average_grade"
      default:
        return order === "asc" ? "created" : "-created"
    }
  } else {
    return order === "asc" ? "created" : "-created"
  }
}
