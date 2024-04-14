import { dockToStarbase } from "../actions/dockToStarbase";
import { loadCargo } from "../actions/loadCargo";
import { subwarpToSector } from "../actions/subwarpToSector";
import { undockFromStarbase } from "../actions/undockFromStarbase";
import { unloadCargo } from "../actions/unloadCargo";
import { warpToSector } from "../actions/warpToSector";
import { MAX_AMOUNT, MovementType } from "../common/constants";
import { NotificationMessage } from "../common/notifications";
import { InputResourcesForCargo, SectorCoordinates } from "../common/types";
import { actionWrapper } from "../utils/actions/actionWrapper";
import { sendNotification } from "../utils/actions/sendNotification";
import { SagePlayer } from "../src/SagePlayer";
import { setFleetV2 } from "../utils/inputsV2/setFleet";
import { setCycles } from "../utils/inputs/setCycles";
import { setStarbaseV2 } from "../utils/inputsV2/setStarbase";
import { setMovementTypeV2 } from "../utils/inputsV2/setMovementType";
import { BN } from "@staratlas/anchor";
import { ResourceName } from "../src/SageGame";
import { CargoPodType } from "../src/SageFleet";
import { setResourcesAmountV2 } from "../utils/inputsV2/setResourcesAmount";
import { setResourceToMine } from "../utils/inputsV2/setResourceToMine";
import { startMining } from "../actions/startMining";
import { stopMining } from "../actions/stopMining";

export const cargoMiningV2 = async (
  player: SagePlayer,
) => {
  // 1. set cycles
  const cycles = await setCycles();

  // 2. set fleet
  const fleet = await setFleetV2(player);
  if (fleet.type !== "Success") return fleet;

  const fleetCurrentSector = await fleet.data.getCurrentSector();

  // 3. set cargo and mining sector
  const starbase = await setStarbaseV2(fleet.data);
  if (starbase.type !== "Success") return starbase;

  const sector = player.getSageGame().getSectorByCoords(starbase.data.data.sector as SectorCoordinates);
  if (sector.type !== "Success") return sector;

  const isSameSector = fleetCurrentSector.key.equals(sector.data.key);

  // 4. set cargo resource allocation
  const resourcesGo = await setResourcesAmountV2(
    "Enter resources to freight in starbase DESTINATION (e.g., Carbon 5000), or press enter to skip:"
  );

  const effectiveResourcesGo: InputResourcesForCargo[] = [];

  // 5. set mining resource
  const resourceToMine = await setResourceToMine(fleet.data, sector.data);
  if (resourceToMine.type !== "Success") return resourceToMine;

  const resourceToMineName = fleet.data.getSageGame().getResourcesMintNameByMint(resourceToMine.data.mineItem.data.mint);
  if (resourceToMineName.type !== "Success") return resourceToMineName;

  // calc fuel, ammo and food needed
  const miningSessionData = fleet.data.getTimeAndNeededResourcesToFullCargoInMining(resourceToMine.data);

  let movementGo, movementBack;
  if (!isSameSector) {
    // 6. set fleet movement type (->)
    movementGo = await setMovementTypeV2()

    // 7. set fleet movement type (<-) 
    movementBack = await setMovementTypeV2()
  }

  // 6 & 7. calculate routes and fuel needed
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
  
  const fuelNeeded = miningSessionData.fuelNeeded + goFuelNeeded + backFuelNeeded + 10000;
  // console.log("Fuel needed:", fuelNeeded);

  const fuelTank = fleet.data.getFuelTank();

  const ammoBank = fleet.data.getAmmoBank()

  const cargoHold = fleet.data.getCargoHold();
  const [foodInCargoData] = cargoHold.resources.filter((item) => item.mint.equals(fleet.data.getSageGame().getResourcesMint().Food));

  // 8. start cargo mining loop
  for (let i = 0; i < cycles; i++) {
    // 1. load fuel
    if (fuelTank.loadedAmount.lt(new BN(fuelNeeded))) {
      await actionWrapper(loadCargo, fleet.data, ResourceName.Fuel, CargoPodType.FuelTank, new BN(MAX_AMOUNT));
    }

    // 2. load ammo
    if (ammoBank.loadedAmount.lt(new BN(miningSessionData.ammoNeeded))) {
      await actionWrapper(loadCargo, fleet.data, ResourceName.Ammo, CargoPodType.AmmoBank, new BN(MAX_AMOUNT));
    }

    // 3. load food
    if (foodInCargoData) {
      if (Number(foodInCargoData.amount || 0) < miningSessionData.foodNeeded) {
        await actionWrapper(loadCargo, fleet.data, ResourceName.Food, CargoPodType.CargoHold, new BN(miningSessionData.foodNeeded - Number(foodInCargoData.amount || 0)));
      }
    } else {
      await actionWrapper(loadCargo, fleet.data, ResourceName.Food, CargoPodType.CargoHold, new BN(miningSessionData.foodNeeded));
    }

    // 4. load cargo go
    for (const item of resourcesGo) {
      const loading = await actionWrapper(loadCargo, fleet.data, item.resource, CargoPodType.CargoHold, new BN(item.amount));
      if (loading.type === "Success")
        effectiveResourcesGo.push(item);
    }
    
    // 5. undock from starbase
    await actionWrapper(undockFromStarbase, fleet.data);

    // 6. move to sector (->)
    if (!isSameSector && movementGo && movementGo.movement === MovementType.Warp) {
      for (let i = 1; i < goRoute.length; i++) {
        const sectorTo = goRoute[i];
        const warp = await actionWrapper(warpToSector, fleet.data, sectorTo, goFuelNeeded, false);
        if (warp.type !== "Success") {
          await actionWrapper(dockToStarbase, fleet.data);
          return warp;
        }
      }   
    }

    if (!isSameSector && movementGo && movementGo.movement === MovementType.Subwarp) {
      const sectorTo = goRoute[1];
      const subwarp = await actionWrapper(subwarpToSector, fleet.data, sectorTo, goFuelNeeded);
      if (subwarp.type !== "Success") {
        await actionWrapper(dockToStarbase, fleet.data);
        return subwarp;
      }
    }

    // 7. dock to starbase
    await actionWrapper(dockToStarbase, fleet.data);

    // 8. unload cargo go
    for (const item of effectiveResourcesGo) {
      await actionWrapper(unloadCargo, fleet.data, item.resource, CargoPodType.CargoHold, new BN(item.amount));
    }

    // 9. undock from starbase
    await actionWrapper(undockFromStarbase, fleet.data);

    // 10. start mining
    await actionWrapper(startMining, fleet.data, resourceToMineName.data, miningSessionData.timeInSeconds);

    // 11. stop mining
    await actionWrapper(stopMining, fleet.data, resourceToMineName.data);

    // 12. move to sector (<-)
    if (!isSameSector && movementBack && movementBack.movement === MovementType.Warp) {
      for (let i = 1; i < backRoute.length; i++) {
        const sectorTo = backRoute[i];
        const warp = await actionWrapper(warpToSector, fleet.data, sectorTo, backFuelNeeded, true);
        if (warp.type !== "Success") {
          await actionWrapper(dockToStarbase, fleet.data);
          return warp;
        }
      }   
    }

    if (!isSameSector && movementBack && movementBack.movement === MovementType.Subwarp) {
      const sectorTo = backRoute[i];
      const subwarp = await actionWrapper(subwarpToSector, fleet.data, sectorTo, backFuelNeeded);
      if (subwarp.type !== "Success") {
        await actionWrapper(dockToStarbase, fleet.data);
        return subwarp;
      }
    }

    // 13. dock to starbase
    await actionWrapper(dockToStarbase, fleet.data);

    // 14. unload cargo back
    await actionWrapper(unloadCargo, fleet.data, resourceToMineName.data, CargoPodType.CargoHold, new BN(MAX_AMOUNT));

    // 15. send notification
    await sendNotification(NotificationMessage.MINING_CARGO_SUCCESS, fleet.data.getName());
  }

  return { type: "Success" as const };
};
