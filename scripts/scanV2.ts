import { BN } from "@staratlas/anchor";
import { dockToStarbase } from "../actions/dockToStarbase";
import { loadCargo } from "../actions/loadCargo";
import { scanSdu } from "../actions/scanSdu";
import { subwarpToSector } from "../actions/subwarpToSector";
import { undockFromStarbase } from "../actions/undockFromStarbase";
import { unloadCargo } from "../actions/unloadCargo";
import { warpToSector } from "../actions/warpToSector";
import { MAX_AMOUNT, MovementType } from "../common/constants";
import { NotificationMessage } from "../common/notifications";
import { CargoPodType, SageFleet, SectorRoute } from "../src/SageFleet";
import { ResourceName } from "../src/SageGame";
import { actionWrapper } from "../utils/actions/actionWrapper";
import { sendNotification } from "../utils/actions/sendNotification";

export const scanV2 = async (
  fleet: SageFleet,
  scanSector: SectorRoute,
  backStarbaseSector: SectorRoute,
  movementGoBack: MovementType
) => {
  // except for the first loop, with each new loop the fleet starts always in a starbase sector
  if (
    fleet.getCurrentSector().hasStarbase &&
    fleet.getCurrentState().StarbaseLoadingBay &&
    !scanSector.key.equals(backStarbaseSector.key)
  ) {
    // calculate routes and fuel needed
    const [goRoute, goFuelNeeded] = fleet.calculateRouteToSector(
      fleet.getCurrentSector().coordinates,
      scanSector.coordinates,
      movementGoBack
    );

    const [backRoute, backFuelNeeded] = fleet.calculateRouteToSector(
      scanSector.coordinates,
      fleet.getCurrentSector().coordinates,
      movementGoBack
    );

    const fuelNeeded =
      goFuelNeeded +
      Math.round(goFuelNeeded * 0.3) +
      (backFuelNeeded + Math.round(backFuelNeeded * 0.3));

    if (new BN(fuelNeeded).gt(fleet.getFuelTank().maxCapacity))
      return { type: "NotEnoughFuelCapacity" as const };

    // load fuel
    if (fleet.getFuelTank().loadedAmount.lt(new BN(fuelNeeded))) {
      await actionWrapper(
        loadCargo,
        fleet,
        ResourceName.Fuel,
        CargoPodType.FuelTank,
        new BN(MAX_AMOUNT)
      );
    }

    // load food
    if (!fleet.getOnlyDataRunner()) {
      await actionWrapper(
        loadCargo,
        fleet,
        ResourceName.Food,
        CargoPodType.CargoHold,
        new BN(
          fleet.getCargoHold().maxCapacity -
            fleet.getStats().miscStats.sduPerScan * 3
        )
      );
      // await actionWrapper(loadCargo, fleet, ResourceName.Food, CargoPodType.CargoHold, new BN(20));
    }

    // undock from starbase
    await actionWrapper(undockFromStarbase, fleet);
  }

  if (
    fleet.getCurrentSector().hasStarbase &&
    fleet.getCurrentState().StarbaseLoadingBay &&
    scanSector.key.equals(backStarbaseSector.key)
  ) {
    // load food
    if (!fleet.getOnlyDataRunner()) {
      await actionWrapper(
        loadCargo,
        fleet,
        ResourceName.Food,
        CargoPodType.CargoHold,
        new BN(
          fleet.getCargoHold().maxCapacity -
            fleet.getStats().miscStats.sduPerScan * 3
        )
      );
      // await actionWrapper(loadCargo, fleet, ResourceName.Food, CargoPodType.CargoHold, new BN(20));
    }

    // undock from starbase
    await actionWrapper(undockFromStarbase, fleet);
  }

  //if (fleet.getCurrentState().Idle || fleet.getCurrentState().MoveSubwarp || fleet.getCurrentState().MoveWarp) {
  // calculate routes and fuel needed
  if (!fleet.getCurrentSector().key.equals(scanSector.key)) {
    const [goRoute, goFuelNeeded] = fleet.calculateRouteToSector(
      fleet.getCurrentSector().coordinates,
      scanSector.coordinates,
      movementGoBack
    );

    const fuelNeeded = goFuelNeeded + Math.round(goFuelNeeded * 0.3);

    if (
      fuelNeeded !== 0 &&
      fleet.getFuelTank().loadedAmount.lt(new BN(fuelNeeded))
    ) {
      return { type: "NotEnoughFuelToGo" as const };
    }

    // move to sector (->)
    if (movementGoBack === "Warp") {
      for (let i = 1; i < goRoute.length; i++) {
        const sectorTo = goRoute[i];
        const warp = await actionWrapper(
          warpToSector,
          fleet,
          sectorTo,
          fuelNeeded,
          i < goRoute.length - 1
        );
        if (warp.type !== "Success") {
          return warp;
        }
      }
    }

    if (movementGoBack === "Subwarp") {
      const sectorTo = goRoute[1];
      const subwarp = await actionWrapper(
        subwarpToSector,
        fleet,
        sectorTo,
        fuelNeeded
      );
      if (subwarp.type !== "Success") {
        return subwarp;
      }
    }
  }

  // scan - during this cycle the position of the fleet may change
  for (let i = 1; i < MAX_AMOUNT; i++) {
    const scan = await actionWrapper(scanSdu, fleet, i);
    if (scan.type !== "Success") break;
  }

  // check fleet position and create the route to come back
  const fleetAfterScanSector = fleet.getCurrentSector();
  if (!fleetAfterScanSector)
    return { type: "FleetCurrentSectorError" as const };

  if (!fleetAfterScanSector.key.equals(backStarbaseSector.key)) {
    // calculate routes and fuel needed
    const [backRoute, backFuelNeeded] = fleet.calculateRouteToSector(
      fleetAfterScanSector.coordinates,
      backStarbaseSector.coordinates,
      movementGoBack
    );

    const fuelNeeded = backFuelNeeded + Math.round(backFuelNeeded * 0.3);

    if (
      fuelNeeded !== 0 &&
      fleet.getFuelTank().loadedAmount.lt(new BN(fuelNeeded))
    ) {
      return { type: "NotEnoughFuelToCombeBack" as const };
    }

    // move to sector (<-)
    if (movementGoBack === "Warp") {
      for (let i = 1; i < backRoute.length; i++) {
        const sectorTo = backRoute[i];
        const warp = await actionWrapper(
          warpToSector,
          fleet,
          sectorTo,
          fuelNeeded,
          true
        );
        if (warp.type !== "Success") {
          return warp;
        }
      }
    }

    if (movementGoBack === "Subwarp") {
      const sectorTo = backRoute[1];
      const subwarp = await actionWrapper(
        subwarpToSector,
        fleet,
        sectorTo,
        fuelNeeded
      );
      if (subwarp.type !== "Success") {
        return subwarp;
      }
    }
  }

  // dock to starbase
  await actionWrapper(dockToStarbase, fleet);

  // unload cargo
  await actionWrapper(
    unloadCargo,
    fleet,
    ResourceName.Sdu,
    CargoPodType.CargoHold,
    new BN(MAX_AMOUNT)
  );

  if (!fleet.getOnlyDataRunner()) {
    await actionWrapper(
      unloadCargo,
      fleet,
      ResourceName.Food,
      CargoPodType.CargoHold,
      new BN(MAX_AMOUNT)
    );
  }

  // send notification
  await sendNotification(NotificationMessage.SCAN_SUCCESS, fleet.getName());

  return { type: "Success" as const };
  // }
};
