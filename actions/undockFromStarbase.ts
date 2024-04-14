import { SageFleet } from "../src/SageFleet";

export const undockFromStarbase = async (
  fleet: SageFleet
) => {
  // action starts
  console.log("\nUndocking from starbase...");

  // data
  // ...

  // instruction
  const ix = await fleet.ixUndockFromStarbase();

  // issues and errors handling
  switch (ix.type) {
    // issues that lead to the next action of the main script or the end of the script
    // ...
    
    // blocking errors or failures that require retrying the entire action
    default:
      if (ix.type !== "Success") throw new Error(ix.type); // retry entire action
  }

  // build and send transactions
  const sdt = await fleet.getSageGame().buildAndSendDynamicTransactions(ix.ixs, false);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  // other
  console.log("Fleet undocked!");
  await fleet.getSageGame().getQuattrinoBalance();

  // action ends
  return { type: "Success" as const }
};