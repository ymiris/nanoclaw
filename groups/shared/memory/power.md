# Power & Energy State

*Owned and maintained by Sól. All agents may read.*

Last updated: 2026-03-07

## Infrastructure

| Source | System | Status |
|--------|--------|--------|
| Solar + Battery | Generac PWRcell | On LAN, not yet in HA |
| Grid | Utility | Active |
| Aquarium | Neptune Apex | Monitored per-outlet |

## Aquarium Power (from Apex)

| Outlet | Typical Draw |
|--------|-------------|
| Returnpump | ~51W |
| RetPump_2_3 | TBD |
| Heater_2_4 | TBD |
| Skimmer_2_5 | 0W (currently off) |
| Pump_2_6 | TBD |
| RefLght_2_7 | TBD (scheduled) |
| Fan_2_8 | TBD |

Total aquarium: ~51W known + TBD for other outlets

## Home Energy (from HA)

*Sól to populate after first energy survey session.*

## Solar Production

*Not yet available — Generac not integrated into HA. User checks PWRview app directly.*

Pending: Install HACS bentastic27/ha-generac integration to bring solar production, battery %, and grid import/export into HA.

## Baselines

*Sól to populate.*

## Notes

- Apex voltage: 119V nominal (probe 2_P16)
- Skimmer currently off — excluded from baseline until re-enabled
