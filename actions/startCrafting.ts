import { Recipe } from "@staratlas/crafting";
import { InstructionReturn } from "@staratlas/data-source";
import { Starbase } from "@staratlas/sage";
import { SageCrafting } from "../src/SageCrafting";
import { wait } from "../utils/actions/wait";

export const startCrafting = async (
  crafting: SageCrafting,
  starbase: Starbase,
  recipe: Recipe,
  quantity: number,
  numCrew: number,
  craftingId: number,
) => {
  // action starts
  console.log(`\nStart crafting...`);

  // data

  // instruction
  let ix = await crafting.ixStartCrafting(starbase, recipe, quantity, numCrew, craftingId);

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
  if (crafting.getRecipeIngredients(recipe).inputs.length > 1) {
    const last_ix = ix.ixs.pop();
    if (last_ix) {
      last_ixs.push(last_ix);
    }
  }

  // build and send transactions
  const sdt = await crafting.getSageGame().buildAndSendDynamicTransactions(ix.ixs, true);
  if (sdt.type !== "Success") throw new Error(sdt.type); // retry entire action

  if (last_ixs.length > 0) {
    const last_sdt = await crafting.getSageGame().buildAndSendDynamicTransactions(last_ixs, false);
    if (last_sdt.type !== "Success") throw new Error(last_sdt.type); // retry entire action
  }
  
  // other
  const duration = crafting.calculateCraftingDuration(recipe, quantity, numCrew);
  console.log(`Waiting for ${duration} seconds...`);
  await wait(duration);

  // action ends
  return { type: "Success" as const }
};
