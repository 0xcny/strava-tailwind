export const MAX_WEATHER_QUERY_INTERVAL = 3000 // m maximum distance in between weather api requests. (Should never be lower than 2000)
export const ACTIVELY_ACQUIRED_KOM_THRESHOLD = 86400000 // (ms) 24h. Time between creation and acquisition of the Kom. If above the value it's calssified as actively gained
export const KOM_REGAINED_THRESHOLD = 43200000 // (ms) 12. Time between loss and regain of the KOM. Designates it as regained.
export const MOBILE_BREAKPOINT = 768
export const THRESHOLD = {
  CIRCUIT: 50, // m distance between start and end coordinate
  CLIMB: 7, // % positive average grade
  DOWNHILL: -6, // % negative average grade
  OVERLONG: 10000, // m segment length
  CURVY: 1.25, // amount of curves / 1000m
  STRAIGHT: 20, // degree max bearing change
  UNCONTESTED: 0.01, // efforts per day since creation (˜35/year)
  CONTESTED: 4000, // efforts total
}
