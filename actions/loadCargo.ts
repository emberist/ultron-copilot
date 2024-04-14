import { CargoPodType, SageFleet } from "../src/SageFleet";
import { ResourceName } from "../src/SageGame";
import { BN } from "@staratlas/anchor";

export const loadCargo = async (
  fleet: SageFleet,
  resourceName: ResourceName,
  cargoPodType: CargoPodType,
  amount: BN
) => {
  // action starts
  console.log(`\nLoading ${amount} ${resourceName} to fleet...`);

  // data
  // ...

  // instruction
  const ix = await fleet.ixLoadCargo(resourceName, cargoPodType, amount);

  // issues and errors handling
  switch (ix.type) {
    // issues that lead to the next action of the main script or the end of the script
    case "FleetCargoPodIsFull":
      console.log("Your fleet cargo is full");
      return ix;

    case "StarbaseCargoIsEmpty":
      console.log("Starbase cargo is empty");
      return ix;

    // blocking errors or failures that require retrying the entire action
    default:
      if (ix.type !== "Success") throw new Error(ix.type); // retry entire action
  }

  // build and send transactions
  const sdt = await fleet.getSageGame().buildAndSendDynamicTransactions(ix.ixs, true);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  // other
  console.log("Fleet cargo loaded!");
  await fleet.getSageGame().getQuattrinoBalance();

  // action ends
  return { type: "Success" as const }
};
