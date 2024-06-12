import { BN } from "@staratlas/anchor";
import { ResourceName } from "../src/SageGame";
import { CargoPodType, SageFleet } from "../src/SageFleet";

export const unloadCargo = async (
  fleet: SageFleet,
  resourceName: ResourceName,
  cargoPodType: CargoPodType,
  amount: BN
) => {
  // action starts
  console.log(`\nUnloading ${resourceName} from fleet...`);

  // data
  // ...

  // instruction
  const ix = await fleet.ixUnloadCargo(resourceName, cargoPodType, amount);

  // issues and errors handling
  switch (ix.type) {
    // issues that lead to the next action of the main script or the end of the script
    case "FleetNotDockedToStarbase":
      console.log(`Fleet not docked!`);
      return { type: "FleetNotDockedToStarbase" as const };
    case "NoResourcesToWithdraw":
      console.log(`No ${resourceName} to withdraw`);
      return { type: "NoResourcesToWithdraw" as const };

    // blocking errors or failures that require retrying the entire action
    default:
      if (ix.type !== "Success") throw new Error(ix.type);
  }

  // build and send transactions
  const sdt = await fleet.getSageGame().buildAndSendDynamicTransactions(ix.ixs, true);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  // other
  console.log(`Unloaded ${ix.amountToWithdraw} ${resourceName} from cargo!`);

  // action ends
  return { type: "Success" as const };
};
