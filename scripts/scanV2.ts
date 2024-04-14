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

export const scanV2 = async (
  player: SagePlayer,
) => {
  // 1. set cycles
  const cycles = await setCycles();

  // 2. set fleet
  const fleet = await setFleetV2(player);
  if (fleet.type !== "Success") return fleet;

  const fleetCurrentSector = await fleet.data.getCurrentSector();

  // 3. set sector coords
  const coords = await setScanCoordinates();
  if (coords.type !== "Success") return coords;

  const sector = await player.getSageGame().getSectorByCoordsAsync(coords.data);
  if (sector.type !== "Success") return sector;

  const isSameSector = fleetCurrentSector.key.equals(sector.data.key);

  let movementGo, movementBack;
  if (!isSameSector) {
    // 4. set fleet movement type (->)
    movementGo = await setMovementTypeV2()

    // 5. set fleet movement type (<-) 
    movementBack = await setMovementTypeV2()
  }

  // 4 & 5. calculate routes and fuel needed
  const [goRoute, goFuelNeeded] = fleet.data.calculateRouteToSector(
    fleetCurrentSector, 
    sector.data,
    movementGo?.movement,
  );
  
  const [backRoute, backFuelNeeded] = fleet.data.calculateRouteToSector(
    sector.data, 
    fleetCurrentSector,
    movementBack?.movement,
  );
  
  const fuelNeeded = goFuelNeeded + backFuelNeeded + 10000;
  // console.log("Fuel needed:", fuelNeeded);

  const fuelTank = fleet.data.getFuelTank();

  // 6. start scan loop
  for (let i = 0; i < cycles; i++) {
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
        const warp = await actionWrapper(warpToSector, fleet.data, sectorTo, goFuelNeeded, false);
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
    for (let i = 1; i < 10; i++) {
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
