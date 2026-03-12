# Home State

*Owned and maintained by Freya. All agents may read.*

Last updated: 2026-03-12

## Infrastructure

| System | URL | Notes |
|--------|-----|-------|
| Home Assistant | http://192.168.5.147:8123 | Auth via HA_TOKEN env var |
| Generac PWRcell | On LAN, not yet in HA | HACS integration pending (bentastic27/ha-generac) |
| Ollama | http://192.168.5.33:11434 | Local LLM for agent use |

## 3D Printers

| Printer | Build Volume | Notes |
|---------|-------------|-------|
| Creality Ender 5 Max | 400 × 400 × 400 mm | Main workhorse, large bed |
| Creality K2 Plus | 350 × 350 × 350 mm | Multi-material, up to 4 colors, fast |

STL output goes to the requesting agent's `output/` folder on the host.

## Devices & Integrations

*Freya to populate after first home inventory session.*

### Lights
- (populate)

### Climate
- (populate)

### Security / Locks
- (populate)

### Sensors
- (populate)

## Active Automations

*Freya to populate.*

## Pending Work

- Add Generac HACS integration (bentastic27/ha-generac) once PWRview credentials available
- Complete device inventory

## Notes

- Aquarium is on a separate circuit monitored by Neptune Apex (see reef.md)
