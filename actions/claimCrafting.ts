import { Recipe } from "@staratlas/crafting";
import { InstructionReturn } from "@staratlas/data-source";
import { Starbase } from "@staratlas/sage";
import { SageCrafting } from "../src/SageCrafting";
import { wait } from "../utils/actions/wait";

export const claimCrafting = async (
  crafting: SageCrafting,
  starbase: Starbase,
  recipe: Recipe,
  craftingId: number,
) => {
  // action starts
  console.log(`\nClaiming crafting outputs...`);

  // data
  while (true) {
    const craftingProcessCompleted = await crafting.isCraftingProcessCompleted(starbase, recipe, craftingId);
    if (craftingProcessCompleted.type !== "Success") throw new Error(craftingProcessCompleted.type);
    if (!!craftingProcessCompleted.data.completed) break;
    console.log(`Crafting not completed yet! Waiting for ${craftingProcessCompleted.data.timeToEnd} seconds...`);
    await wait(craftingProcessCompleted.data.timeToEnd);
  }

  // instruction
  let ix = await crafting.ixClaimCrafting(starbase, recipe, craftingId);

  // issues and errors handling
  switch (ix.type) {
    // issues that lead to the next action of the main script or the end of the script
    case "CargoPodsNotFound":
      return { type: "CargoPodsNotFound" as const };

    // blocking errors or failures that require retrying the entire action
    default:
      if (ix.type !== "Success") throw new Error(ix.type); // retry entire action
  }

  let last_ixs: InstructionReturn[] = [];
  const last_ix = ix.ixs.pop();
  if (last_ix) {
    last_ixs.push(last_ix);
  }

  // build and send transactions
  const sdt = await crafting.getSageGame().buildAndSendDynamicTransactions(ix.ixs, true);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  if (last_ixs.length > 0) {
    const last_sdt = await crafting.getSageGame().buildAndSendDynamicTransactions(last_ixs, false);
    if (last_sdt.type !== "Success") throw new Error(last_sdt.type); // retry entire action
  }

  // other
  console.log(`Craft completed!`);

  // action ends
  return { type: "Success" as const }
};
