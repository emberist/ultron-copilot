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
import { BN } from "@staratlas/anchor";
import { ResourceName } from "../src/SageGame";
import { CargoPodType, SageFleet, SectorRoute } from "../src/SageFleet";
import { scanSdu } from "../actions/scanSdu";

export const scanV2 = async (
  fleet: SageFleet,
  fuelNeeded: number,
  movementGo?: MovementType,
  goRoute?: SectorRoute[],
  goFuelNeeded?: number,
  movementBack?: MovementType,
  backRoute?: SectorRoute[],
  backFuelNeeded?: number,
) => {
  const fleetCurrentSector = fleet.getCurrentSector();
  if (!fleetCurrentSector) return { type: "FleetCurrentSectorError" as const };

  const fuelTank = fleet.getFuelTank();

  if (new BN(fuelNeeded).gt(fuelTank.maxCapacity)) return { type: "NotEnoughFuelCapacity" as const };

  // 0. Dock to starbase (optional)
  if (
    !fleet.getCurrentState().StarbaseLoadingBay && 
    fleet.getSageGame().getStarbaseByCoords(fleetCurrentSector.coordinates).type === "Success"
  ) {
    await actionWrapper(dockToStarbase, fleet);
  } else if (
    !fleet.getCurrentState().StarbaseLoadingBay && 
    fleet.getSageGame().getStarbaseByCoords(fleetCurrentSector.coordinates).type !== "Success"
  ) {
    return fleet.getSageGame().getStarbaseByCoords(fleetCurrentSector.coordinates);
  }

  // 1. load fuel
  if (fuelTank.loadedAmount.lt(new BN(fuelNeeded)) && fuelNeeded > 0) { // Temporary for Subwarp Bug
    await actionWrapper(loadCargo, fleet, ResourceName.Fuel, CargoPodType.FuelTank, new BN(MAX_AMOUNT));
  }

  if (fuelNeeded === 0) { // Temporary for Subwarp Bug
    await actionWrapper(unloadCargo, fleet, ResourceName.Fuel, CargoPodType.FuelTank, fuelTank.loadedAmount);
  }

  // 2. load food
  if (!fleet.getOnlyDataRunner()) {
    await actionWrapper(loadCargo, fleet, ResourceName.Food, CargoPodType.CargoHold, new BN(MAX_AMOUNT));
  }
  
  // 3. undock from starbase
  await actionWrapper(undockFromStarbase, fleet);

  // 4. move to sector (->)
  if (movementGo && movementGo === MovementType.Warp && goRoute && goFuelNeeded) {
    for (let i = 1; i < goRoute.length; i++) {
      const sectorTo = goRoute[i];
      const warp = await actionWrapper(warpToSector, fleet, sectorTo, goFuelNeeded, i < goRoute.length - 1);
      if (warp.type !== "Success") {
        return warp;
      }
    }   
  }

  if (movementGo && movementGo === MovementType.Subwarp && goRoute && goFuelNeeded !== undefined && goFuelNeeded >= 0) { // Temporary condition for subwarp bug
    console.log("OK")
    const sectorTo = goRoute[1];
    const subwarp = await actionWrapper(subwarpToSector, fleet, sectorTo, goFuelNeeded);
    if (subwarp.type !== "Success") {
      return subwarp;
    }
  }

  // 6. scan sector
  for (let i = 1; i < MAX_AMOUNT; i++) {
    const scan = await actionWrapper(scanSdu, fleet, i);
    if (scan.type !== "Success") break;
  }

  // 10. move to sector (<-)
  if (movementBack && movementBack === MovementType.Warp && backRoute && backFuelNeeded) {
    for (let i = 1; i < backRoute.length; i++) {
      const sectorTo = backRoute[i];
      const warp = await actionWrapper(warpToSector, fleet, sectorTo, backFuelNeeded, true);
      if (warp.type !== "Success") {
        return warp;
      }
    }   
  }

  if (movementBack && movementBack === MovementType.Subwarp && backRoute && backFuelNeeded !== undefined && backFuelNeeded >= 0) { // Temporary condition for subwarp bug
    const sectorTo = backRoute[1];
    const subwarp = await actionWrapper(subwarpToSector, fleet, sectorTo, backFuelNeeded);
    if (subwarp.type !== "Success") {
      return subwarp;
    }
  }

  // 11. dock to starbase
  await actionWrapper(dockToStarbase, fleet);

  // 12. unload cargo
  await actionWrapper(unloadCargo, fleet, ResourceName.Sdu, CargoPodType.CargoHold, new BN(MAX_AMOUNT));
  
  if (!fleet.getOnlyDataRunner()) {
    await actionWrapper(unloadCargo, fleet, ResourceName.Food, CargoPodType.CargoHold, new BN(MAX_AMOUNT));
  }

  // 13. send notification
  await sendNotification(NotificationMessage.SCAN_SUCCESS, fleet.getName());

  return { type: "Success" as const };
};
