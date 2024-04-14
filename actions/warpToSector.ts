import { wait } from "../utils/actions/wait";
import { SageFleet } from "../src/SageFleet";
import { Sector } from "@staratlas/sage";
import { BN } from "@staratlas/anchor";

export const warpToSector = async (
  fleet: SageFleet,
  sector: Sector,
  fuelNeeded: number,
  waitCooldown?: boolean
) => {
  // action starts
  console.log(`\nStart warp...`);

  // data

  const sectorsDistance = fleet.getSageGame().calculateDistanceBySector(fleet.getCurrentSector(), sector);
  const timeToWarp = fleet.calculateWarpTimeWithDistance(sectorsDistance);

  // instruction
  const ix = await fleet.ixWarpToSector(sector, new BN(fuelNeeded));

  // issues and errors handling
  switch (ix.type) {
    // issues that lead to the next action of the main script or the end of the script
    case "NoEnoughFuelToWarp":
      return ix;
    
    // blocking errors or failures that require retrying the entire action
    default:
      if (ix.type !== "Success") throw new Error(ix.type); // retry entire action
  }

  // build and send transactions
  const sdt = await fleet.getSageGame().buildAndSendDynamicTransactions(ix.ixs, true);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  // other
  console.log(`Waiting for ${timeToWarp} seconds...`);
  await wait(timeToWarp);
  console.log(`Warp completed!`);
  
  await fleet.getSageGame().getQuattrinoBalance();

  if (waitCooldown) {
    await wait(fleet.getMovementStats().warpCoolDown);
  }

  // action ends
  return { type: "Success" as const }
};
