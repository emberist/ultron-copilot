import { Recipe } from "@staratlas/crafting";
import { Starbase } from "@staratlas/sage";
import { claimCrafting } from "../actions/claimCrafting";
import { startCrafting } from "../actions/startCrafting";
import { NotificationMessage } from "../common/notifications";
import { SageCrafting } from "../src/SageCrafting";
import { actionWrapper } from "../utils/actions/actionWrapper";
import { sendNotification } from "../utils/actions/sendNotification";

export const craftV2 = async (
  crafting: SageCrafting,
  starbase: Starbase,
  recipe: Recipe,
  quantity: number,
  numCrew: number
) => {

  const craftingId = crafting.generateCraftingId();

  await actionWrapper(
    startCrafting,
    crafting,
    starbase,
    recipe,
    quantity,
    numCrew,
    craftingId,
  );

  await actionWrapper(
    claimCrafting,
    crafting,
    starbase,
    recipe,
    craftingId,
  );

  // send notification
  await sendNotification(NotificationMessage.CRAFT_SUCCESS);

  return { type: "Success" as const };

};