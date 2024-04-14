import { wait } from "../utils/actions/wait";
import { SageFleet } from "../src/SageFleet";

export const scanSdu = async (
  fleet: SageFleet,
  counter?: number
) => {
  // action starts
  console.log(`\n${counter}. Scanning sector...`);

  // data
  // ...

  // instruction
  const ix = await fleet.ixScanForSurveyDataUnits();

  // issues and errors handling
  switch (ix.type) {
    // issues that lead to the next action of the main script or the end of the script
    case "NoEnoughFood":
      console.log("No enough food to scan");
      return ix;

    case "FleetCargoIsFull":
      console.log("Your fleet cargo is full");
      return ix;

    // blocking errors or failures that require retrying the entire action
    default:
      if (ix.type !== "Success") throw new Error(ix.type); // retry entire action
  }
  
  // build and send transactions
  const sdt = await fleet.getSageGame().buildAndSendDynamicTransactions(ix.ixs, false);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  // other
  console.log(`Scan completed!`);
  console.log(`\nWaiting Scan Cooldown for ${fleet.getStats().miscStats.scanCoolDown} seconds...`);
  
  await wait(fleet.getStats().miscStats.scanCoolDown);

  // action ends
  return { type: "Success" as const } 
};