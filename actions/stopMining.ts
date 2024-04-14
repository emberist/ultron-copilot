import { SageFleet } from "../src/SageFleet";
import { ResourceName } from "../src/SageGame";

export const stopMining = async (
  fleet: SageFleet,
  resourceName: ResourceName
) => {
  // action starts
  console.log(`\nStop mining ${resourceName}...`);

  // data
  // ...

  // instruction
  const ix = await fleet.ixStopMining();

  // issues and errors handling
  switch (ix.type) {
    // issues that lead to the next action of the main script or the end of the script
    // ...
    
    // blocking errors or failures that require retrying the entire action
    default:
      if (ix.type !== "Success") throw new Error(ix.type); // retry entire action
  }

  // build and send transactions
  const sdt = await fleet.getSageGame().buildAndSendDynamicTransactions(ix.ixs, resourceName !== ResourceName.Hydrogen);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  // other
  console.log(`Mining stopped!`);
  await fleet.getSageGame().getQuattrinoBalance();

  // action ends
  return { type: "Success" as const }
};
