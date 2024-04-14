import { wait } from "../utils/actions/wait";
import { ResourceName } from "../src/SageGame";
import { SageFleet } from "../src/SageFleet";

export const startMining = async (
  fleet: SageFleet,
  resourceName: ResourceName,
  time: number,
) => {
  // action starts
  console.log(`\nStart mining ${resourceName}...`);

  // data
  // ...

  // instruction
  const ix = await fleet.ixStartMining(resourceName);

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
  console.log(`Mining started! Waiting for ${time} seconds...`);
  await fleet.getSageGame().getQuattrinoBalance();
  await wait(time);

  // action ends
  return { type: "Success" as const }
};
