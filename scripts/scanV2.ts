import { dockToStarbase } from "../actions/dockToStarbase";
import { loadCargo } from "../actions/loadCargo";
import { subwarpToSector } from "../actions/subwarpToSector";
import { undockFromStarbase } from "../actions/undockFromStarbase";
import { unloadCargo } from "../actions/unloadCargo";
import { warpToSector } from "../actions/warpToSector";
import { MAX_AMOUNT, MovementType } from "../common/constants";
import { NotificationMessage } from "../common/notifications";
import { actionWrapper } from "../utils/actions/actionWrapper";
import { sendNotification } from "../utils/actions/sendNotification";
import { SagePlayer } from "../src/SagePlayer";
import { setFleetV2 } from "../utils/inputsV2/setFleet";
import { setCycles } from "../utils/inputs/setCycles";
import { setMovementTypeV2 } from "../utils/inputsV2/setMovementType";
import { BN } from "@staratlas/anchor";
import { ResourceName } from "../src/SageGame";
import { CargoPodType } from "../src/SageFleet";
import { setScanCoordinates } from "../utils/inputsV2/setScanCoordinates";
import { scanSdu } from "../actions/scanSdu";
import { SectorCoordinates } from "../common/types";

export const scanV2 = async (
  player: SagePlayer,
) => {
  // 1. set cycles
  const cycles = await setCycles();

  // 2. set fleet
  const fleet = await setFleetV2(player);
  if (fleet.type !== "Success") return fleet;

  const fleetCurrentSector = fleet.data.getCurrentSector();
  if (fleetCurrentSector.type !== "Success") return fleetCurrentSector;

  // 3. set sector coords
  const coords = await setScanCoordinates();
  if (coords.type !== "Success") return coords;

  const sector = await player.getSageGame().getSectorByCoordsAsync(coords.data);
  if (sector.type !== "Success") return sector;

  const isSameSector = fleetCurrentSector.data.key.equals(sector.data.key);

  let movementGo, movementBack;
  if (!isSameSector) {
    // 4. set fleet movement type (->)
    movementGo = await setMovementTypeV2("(->)")

    // 5. set fleet movement type (<-) 
    movementBack = await setMovementTypeV2("(<-)")
  }

  // 4 & 5. calculate routes and fuel needed
  const [goRoute, goFuelNeeded] = await fleet.data.calculateRouteToSector(
    fleetCurrentSector.data.coordinates as SectorCoordinates, 
    sector.data.data.coordinates as SectorCoordinates,
    movementGo?.movement,
  );
  
  const [backRoute, backFuelNeeded] = await fleet.data.calculateRouteToSector(
    sector.data.data.coordinates as SectorCoordinates, 
    fleetCurrentSector.data.coordinates as SectorCoordinates,
    movementBack?.movement,
  );
  
  const fuelNeeded = (goFuelNeeded + Math.round(goFuelNeeded * 0.3)) + (backFuelNeeded + Math.round(backFuelNeeded * 0.3));
  // console.log("Fuel needed:", fuelNeeded);

  // 6. start scan loop
  for (let i = 0; i < cycles; i++) {
    const fuelTank = fleet.data.getFuelTank();
  
    if (new BN(fuelNeeded).gt(fuelTank.maxCapacity)) return { type: "NotEnoughFuelCapacity" as const };

    // 0. Dock to starbase (optional)
    if (
      !fleet.data.getCurrentState().StarbaseLoadingBay && 
      fleet.data.getSageGame().getStarbaseByCoords(fleetCurrentSector.data.coordinates).type === "Success"
    ) {
      await actionWrapper(dockToStarbase, fleet.data);
    } else if (
      !fleet.data.getCurrentState().StarbaseLoadingBay && 
      fleet.data.getSageGame().getStarbaseByCoords(fleetCurrentSector.data.coordinates).type !== "Success"
    ) {
      return fleet.data.getSageGame().getStarbaseByCoords(fleetCurrentSector.data.coordinates);
    }

    // 1. load fuel
    if (fuelTank.loadedAmount.lt(new BN(fuelNeeded))) {
      await actionWrapper(loadCargo, fleet.data, ResourceName.Fuel, CargoPodType.FuelTank, new BN(MAX_AMOUNT));
    }

    // 2. load food
    if (!fleet.data.getOnlyDataRunner()) {
      await actionWrapper(loadCargo, fleet.data, ResourceName.Food, CargoPodType.CargoHold, new BN(MAX_AMOUNT));
    }
    
    // 3. undock from starbase
    await actionWrapper(undockFromStarbase, fleet.data);

    // 4. move to sector (->)
    if (!isSameSector && movementGo && movementGo.movement === MovementType.Warp) {
      for (let i = 1; i < goRoute.length; i++) {
        const sectorTo = goRoute[i];
        const warp = await actionWrapper(warpToSector, fleet.data, sectorTo, goFuelNeeded, i < goRoute.length - 1);
        if (warp.type !== "Success") {
          return warp;
        }
      }   
    }

    if (!isSameSector && movementGo && movementGo.movement === MovementType.Subwarp) {
      const sectorTo = goRoute[1];
      const subwarp = await actionWrapper(subwarpToSector, fleet.data, sectorTo, goFuelNeeded);
      if (subwarp.type !== "Success") {
        return subwarp;
      }
    }

    // 6. scan sector
    for (let i = 1; i < MAX_AMOUNT; i++) {
      const scan = await actionWrapper(scanSdu, fleet.data, i);
      if (scan.type !== "Success") break;
    }

    // 10. move to sector (<-)
    if (!isSameSector && movementBack && movementBack.movement === MovementType.Warp) {
      for (let i = 1; i < backRoute.length; i++) {
        const sectorTo = backRoute[i];
        const warp = await actionWrapper(warpToSector, fleet.data, sectorTo, backFuelNeeded, true);
        if (warp.type !== "Success") {
          return warp;
        }
      }   
    }

    if (!isSameSector && movementBack && movementBack.movement === MovementType.Subwarp) {
      const sectorTo = backRoute[i];
      const subwarp = await actionWrapper(subwarpToSector, fleet.data, sectorTo, backFuelNeeded);
      if (subwarp.type !== "Success") {
        return subwarp;
      }
    }

    // 11. dock to starbase
    await actionWrapper(dockToStarbase, fleet.data);

    // 12. unload cargo
    await actionWrapper(unloadCargo, fleet.data, ResourceName.Sdu, CargoPodType.CargoHold, new BN(MAX_AMOUNT));
    if (!fleet.data.getOnlyDataRunner()) {
      await actionWrapper(unloadCargo, fleet.data, ResourceName.Food, CargoPodType.CargoHold, new BN(MAX_AMOUNT));
    }

    // 13. send notification
    await sendNotification(NotificationMessage.SCAN_SUCCESS, fleet.data.getName());
  }

  return { type: "Success" as const };
};
