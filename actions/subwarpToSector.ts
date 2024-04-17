import { wait } from "../utils/actions/wait";
import { Sector } from "@staratlas/sage";
import { SageFleet, SectorRoute } from "../src/SageFleet";
import { BN } from "@staratlas/anchor";

export const subwarpToSector = async (
  fleet: SageFleet,
  sector: SectorRoute,
  fuelNeeded: number,
) => {
  // action starts
  console.log(`\nStart subwarp...`);

  // data
  const fleetCurrentSector = fleet.getCurrentSector();
  if (!fleetCurrentSector) return { type: "FleetCurrentSectorError" as const };

  const sectorsDistance = fleet.getSageGame().calculateDistanceByCoords(fleetCurrentSector.coordinates, sector.coordinates);
  const timeToSubwarp = fleet.calculateSubwarpTimeWithDistance(sectorsDistance);

  // instruction
  const ix = await fleet.ixSubwarpToSector(sector, new BN(fuelNeeded));

  // issues and errors handling
  switch (ix.type) {
    // issues that lead to the next action of the main script or the end of the script
    case "NoEnoughFuelToSubwarp":
      return { type: "NoEnoughFuelToSubwarp" as const };
    
    case "FleetIsDocked":
      return { type: "FleetIsDocked" as const };

    case "FleetIsMining":
      return { type: "FleetIsMining" as const };

    // blocking errors or failures that require retrying the entire action
    default:
      if (ix.type !== "Success") throw new Error(ix.type); // retry entire action
  }

  // build and send transactions
  const sdt = await fleet.getSageGame().buildAndSendDynamicTransactions(ix.ixs, true);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  // other
  console.log(`Waiting for ${timeToSubwarp} seconds...`);
  await wait(timeToSubwarp);
  console.log(`Subwarp completed!`);

  // action ends
  return { type: "Success" as const }
};
