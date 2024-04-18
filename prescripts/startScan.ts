import { MovementType } from "../common/constants";
import { SectorCoordinates } from "../common/types";
import { cargoV2 } from "../scripts/cargoV2";
import { scanV2 } from "../scripts/scanV2";
import { SagePlayer } from "../src/SagePlayer";
import { setCycles } from "../utils/inputs/setCycles";
import { setFleetV2 } from "../utils/inputsV2/setFleet";
import { setMovementTypeV2 } from "../utils/inputsV2/setMovementType";
import { setScanCoordinates } from "../utils/inputsV2/setScanCoordinates";

export const startScan = async (player: SagePlayer) => {
  // 1. set cycles
  const cycles = await setCycles();

  // 2. set fleet
  const fleet = await setFleetV2(player, true);
  if (fleet.type !== "Success") return fleet;

  const fleetCurrentSector = fleet.data.getCurrentSector();
  if (!fleetCurrentSector) return { type: "FleetCurrentSectorError" as const };

  // 3. set sector coords
  const coords = await setScanCoordinates();
  if (coords.type !== "Success") return coords;

  const sector = await player.getSageGame().getSectorByCoordsAsync(coords.data);
  if (sector.type !== "Success") return sector;

  const isSameSector = fleetCurrentSector.key.equals(sector.data.key);

  let movementGo, movementBack;
  if (!isSameSector) {
    // 4. set fleet movement type (->)
    movementGo = await setMovementTypeV2("(->)") 
    
    // 5. set fleet movement type (<-) 
    movementBack = await setMovementTypeV2("(<-)")
  }

  // 4 & 5. calculate routes and fuel needed
  const [goRoute, goFuelNeeded] = fleet.data.calculateRouteToSector(
    fleetCurrentSector.coordinates as SectorCoordinates, 
    sector.data.data.coordinates as SectorCoordinates,
    movementGo?.movement,
  );
  
  const [backRoute, backFuelNeeded] = fleet.data.calculateRouteToSector(
    sector.data.data.coordinates as SectorCoordinates, 
    fleetCurrentSector.coordinates as SectorCoordinates,
    movementBack?.movement,
  );
  
  const fuelNeeded = (goFuelNeeded + Math.round(goFuelNeeded * 0.3)) + (backFuelNeeded + Math.round(backFuelNeeded * 0.3));
  // console.log("Fuel needed:", fuelNeeded);

  // 7. start cargo loop
  for (let i = 0; i < cycles; i++) {
    const scan = await scanV2(
      fleet.data,
      movementGo && movementBack && movementGo.movement === MovementType.Subwarp && movementBack.movement === MovementType.Subwarp ? 0 : fuelNeeded, // Temporary for subwarp bug
      movementGo?.movement,
      goRoute,
      movementGo && movementBack && movementGo.movement === MovementType.Subwarp && movementBack.movement === MovementType.Subwarp ? 0 : goFuelNeeded, // Temporary for subwarp bug
      movementBack?.movement,
      backRoute,
      movementGo && movementBack && movementGo.movement === MovementType.Subwarp && movementBack.movement === MovementType.Subwarp ? 0 : backFuelNeeded, // Temporary for subwarp bug
    )
    if (scan.type !== "Success") {
      return scan;
    }
  }

  return { type: "Success" } as const;
}